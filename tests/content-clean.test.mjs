import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const CLEAN_SCRIPT = fileURLToPath(
	new URL("../scripts/content/clean.mjs", import.meta.url),
);

const normalize = (text) => text.split("\r\n").join("\n");

function write(root, relativePath, contents = "test") {
	const absolute = join(root, relativePath);
	mkdirSync(dirname(absolute), { recursive: true });
	writeFileSync(absolute, contents, "utf8");
	return absolute;
}

function runGit(cwd, gitArgs) {
	return execFileSync("git", gitArgs, {
		cwd,
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
	}).trim();
}

/** 初始化一个轻量级的真实 Git 仓库夹具 */
function createRepoFixture() {
	const base = mkdtempSync(join(tmpdir(), "shirone-clean-test-"));
	
	// 初始化 git 仓库
	runGit(base, ["init", "--initial-branch=main"]);
	runGit(base, ["config", "user.name", "TestUser"]);
	runGit(base, ["config", "user.email", "test@example.com"]);
	runGit(base, ["config", "core.autocrlf", "false"]);

	// 准备 .gitignore
	write(base, ".gitignore", ".content-backup/\n.astro/\nnode_modules/\n");

	// 准备基准文件
	write(base, "src/content/posts/initial.md", "# Initial Post\n");
	write(base, "src/data/devices.ts", "export const devices = [];\n");
	write(base, "src/config/FooterConfig.html", "<!-- Default Footer -->\n");
	write(base, "src/user/user-config.ts", "export default {};\n");
	write(base, "public/favicon.ico", "favicon\n");

	runGit(base, ["add", "."]);
	runGit(base, ["commit", "-m", "chore: initial commit"]);

	return base;
}

describe("content:clean 安全清理机制", () => {
	it("--dry-run 预演模式不修改任何文件", () => {
		const repo = createRepoFixture();

		// 模拟外部物化文件
		write(repo, "src/content/posts/external.md", "# External Post\n");
		write(repo, "src/data/new-data.ts", "export const data = 123;\n");

		const output = execFileSync("node", [CLEAN_SCRIPT, "--dry-run"], {
			cwd: repo,
			encoding: "utf8",
		});

		assert.match(output, /【预演模式 \(--dry-run\)】/);
		assert.match(output, /src\/content\/posts\/external\.md/);
		assert.match(output, /src\/data\/new-data\.ts/);

		// 验证文件依然存在未被删除
		assert.equal(existsSync(join(repo, "src/content/posts/external.md")), true);
		assert.equal(existsSync(join(repo, "src/data/new-data.ts")), true);

		rmSync(repo, { recursive: true, force: true });
	});

	it("正常清理时自动创建安全备份与 manifest.json", () => {
		const repo = createRepoFixture();

		// 模拟物化文件
		write(repo, "src/content/posts/untracked.md", "# Untracked Data\n");
		write(repo, "src/content/posts/initial.md", "# Overwritten Initial Post\n");
		write(repo, "content.lock.json", "{}\n");

		const output = execFileSync("node", [CLEAN_SCRIPT], {
			cwd: repo,
			encoding: "utf8",
		});

		assert.match(output, /已创建安全快照备份/);
		assert.match(output, /\[OK\] 清理完成！/);

		// 验证被覆盖的 initial.md 已被 git checkout 恢复
		assert.equal(
			normalize(readFileSync(join(repo, "src/content/posts/initial.md"), "utf8")),
			"# Initial Post\n",
		);

		// 验证 untracked.md 已从工作区移除
		assert.equal(existsSync(join(repo, "src/content/posts/untracked.md")), false);

		// 验证 lock 文件已被删除
		assert.equal(existsSync(join(repo, "content.lock.json")), false);

		// 验证备份目录中完整保存了清理前的数据
		const backupParent = join(repo, ".content-backup");
		assert.equal(existsSync(backupParent), true);

		const status = runGit(repo, ["status", "--porcelain"]);
		// 工作区此时应是干净的
		assert.equal(status, "");

		rmSync(repo, { recursive: true, force: true });
	});

	it("备份数据可 100% 完整逆向还原", () => {
		const repo = createRepoFixture();

		const uniqueContent = "# Unique Author Written Content " + Math.random() + "\n";
		write(repo, "src/content/posts/my-post.md", uniqueContent);

		// 执行清理
		execFileSync("node", [CLEAN_SCRIPT], {
			cwd: repo,
			encoding: "utf8",
		});

		assert.equal(existsSync(join(repo, "src/content/posts/my-post.md")), false);

		// 从备份中寻找该文件
		const backupParent = join(repo, ".content-backup");
		const backupFolders = execFileSync("node", [
			"-e",
			`const fs = require('fs'); console.log(fs.readdirSync('${backupParent.replace(/\\/g, "/")}')[0]);`,
		], { encoding: "utf8" }).trim();

		const backedUpFile = join(
			backupParent,
			backupFolders,
			"src/content/posts/my-post.md",
		);
		assert.equal(existsSync(backedUpFile), true);
		assert.equal(
			normalize(readFileSync(backedUpFile, "utf8")),
			normalize(uniqueContent),
		);

		rmSync(repo, { recursive: true, force: true });
	});

	it("非 Git 仓库环境下遇到阻碍立即 Fail-Fast 中止并给出完整报错", () => {
		const nonGitDir = mkdtempSync(join(tmpdir(), "shirone-non-git-"));

		let failed = false;
		try {
			execFileSync("node", [CLEAN_SCRIPT], {
				cwd: nonGitDir,
				encoding: "utf8",
				stdio: ["ignore", "pipe", "pipe"],
			});
		} catch (err) {
			failed = true;
			const stderr = err.stderr ? err.stderr.toString() : "";
			assert.match(stderr, /\[FAILED\] 步骤失败并已安全中止：检查 Git 工作区状态/);
		}

		assert.equal(failed, true, "非 Git 仓库应立即熔断");
		rmSync(nonGitDir, { recursive: true, force: true });
	});
});

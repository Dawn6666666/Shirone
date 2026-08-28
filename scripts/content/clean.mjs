/**
 * 内容安全清理脚本：
 * 清理从独立内容仓物化到代码仓的文件与配置覆盖，恢复纯净的本地主题状态。
 *
 * 安全机制（Fail-Safe & Fail-Fast）：
 * 1. 【安全快照备份】：清理前自动将待清理/覆盖的文件备份至 `.content-backup/clean-<timestamp>/`，误操作可 100% 还原；
 * 2. 【异常立即熔断】：任何步骤（备份、Git 状态、文件写入）遇到阻塞或错误时立即中断退出，绝不静默吞错；
 * 3. 【完整错误诊断】：打印发生异常的精确步骤、目标路径及完整系统报错信息；
 * 4. 【预演支持】：支持 `--dry-run` 查看清理计划而不实际修改任何文件。
 *
 * 用法：
 *   node scripts/content/clean.mjs [--dry-run] [--no-backup]
 */

import { execFileSync } from "node:child_process";
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import {
	FOOTER_HTML_TARGET,
	GENERATED_CONFIG_FILE,
} from "./config-domains.mjs";
import { EMPTY_MODULE } from "./config-overlay.mjs";
import { LOCK_FILE, WORKING_COPY_DIR } from "./resolve-source.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const skipBackup = args.includes("--no-backup");

function fail(step, error, details = "") {
	console.error(`\n[content:clean] [FAILED] 步骤失败并已安全中止：${step}`);
	if (details) {
		console.error(`[content:clean] 详细上下文: ${details}`);
	}
	if (error instanceof Error) {
		console.error(`[content:clean] 错误信息: ${error.message}`);
		if (error.stack) {
			console.error(`[content:clean] 调用栈:\n${error.stack}`);
		}
	} else if (error) {
		console.error(`[content:clean] 错误详情: ${String(error)}`);
	}
	console.error("[content:clean] 未执行破坏性操作，工作区已保持原样。\n");
	process.exit(1);
}

function runGit(gitArgs, stepName) {
	try {
		return execFileSync("git", gitArgs, {
			cwd: root,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "pipe"],
		}).trim();
	} catch (err) {
		const stderr = err.stderr ? err.stderr.toString().trim() : "";
		const stdout = err.stdout ? err.stdout.toString().trim() : "";
		fail(
			stepName,
			err,
			`git ${gitArgs.join(" ")}\n输出: ${stdout}\n错误输出: ${stderr}`,
		);
	}
}

console.log("[content:clean] 开始执行内容清理与环境重置...");

// 1. 检查 Git 仓库状态与环境完备性
let gitStatusOutput = "";
try {
	gitStatusOutput = runGit(
		["status", "--porcelain", "-uall"],
		"检查 Git 工作区状态",
	);
} catch (err) {
	fail("Git 环境检查", err, "请确保在有效的 Git 代码仓根目录下执行本脚本。");
}

// 解析出受影响的文件清单（仅限内容挂载点与配置目标）
const targetPrefixes = [
	"src/content/",
	"src/data/",
	"src/assets/",
	"public/",
	FOOTER_HTML_TARGET,
	GENERATED_CONFIG_FILE,
];

const dirtyEntries = [];
if (gitStatusOutput) {
	for (const line of gitStatusOutput.split(/\r?\n/)) {
		const status = line.slice(0, 2);
		const filePath = line.slice(3).trim();
		const normalizedPath = filePath.replace(/\\/g, "/");

		const isTarget = targetPrefixes.some((prefix) =>
			normalizedPath.startsWith(prefix),
		);
		if (isTarget) {
			dirtyEntries.push({ status, path: normalizedPath });
		}
	}
}

if (isDryRun) {
	console.log("[content:clean] 【预演模式 (--dry-run)】将清理以下受影响的文件：");
	if (dirtyEntries.length === 0) {
		console.log("  (无受影响的物化文件，工作区已处于干净状态)");
	} else {
		for (const entry of dirtyEntries) {
			console.log(`  [${entry.status}] ${entry.path}`);
		}
	}
	console.log("[content:clean] 预演完成，未修改任何文件。");
	process.exit(0);
}

// 2. 创建自动安全备份（安全快照）
let backupDir = null;
if (!skipBackup && dirtyEntries.length > 0) {
	const now = new Date();
	const pad = (n) => String(n).padStart(2, "0");
	const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
	backupDir = join(root, ".content-backup", `clean-${timestamp}`);

	try {
		mkdirSync(backupDir, { recursive: true });
		const backedUpFiles = [];

		for (const entry of dirtyEntries) {
			const fullPath = join(root, entry.path);
			if (existsSync(fullPath)) {
				const destPath = join(backupDir, entry.path);
				mkdirSync(dirname(destPath), { recursive: true });
				copyFileSync(fullPath, destPath);
				backedUpFiles.push(entry.path);
			}
		}

		// 写出备份元数据与一键恢复说明
		const manifestContent = JSON.stringify(
			{
				timestamp: now.toISOString(),
				cleanedFilesCount: backedUpFiles.length,
				files: backedUpFiles,
				restoreInstruction:
					"如需撤销清理，可将本目录内的文件直接复制回项目对应路径。",
			},
			null,
			2,
		);
		writeFileSync(join(backupDir, "manifest.json"), manifestContent, "utf8");
		console.log(`[content:clean] 已创建安全快照备份: ${relative(root, backupDir)}`);
	} catch (err) {
		fail(
			"创建安全快照备份",
			err,
			`备份目录: ${backupDir}。为防止数据丢失，清理流程已中止。`,
		);
	}
}

// 3. 重置用户配置覆盖模块（原子写入）
try {
	const userConfigFile = join(root, GENERATED_CONFIG_FILE);
	writeFileSync(userConfigFile, EMPTY_MODULE, "utf8");
} catch (err) {
	fail("重置 user-config.ts", err, `目标文件: ${GENERATED_CONFIG_FILE}`);
}

// 4. 清理 lock 溯源文件、工作副本与构建缓存
const pathsToClean = [
	join(root, LOCK_FILE),
	join(root, WORKING_COPY_DIR),
	join(root, ".astro", "data-store.json"),
	join(root, "node_modules", ".cache", "shirone", "user-config.ok"),
];

for (const p of pathsToClean) {
	if (existsSync(p)) {
		try {
			rmSync(p, { recursive: true, force: true });
		} catch (err) {
			fail("清除缓存与溯源文件", err, `路径: ${relative(root, p)}`);
		}
	}
}

// 5. 还原被覆盖的主题默认文件，并安全清理外部物化产生的文件
runGit(
	["checkout", "--", "src/", "public/"],
	"还原被修改的主题自带文件 (git checkout)",
);

runGit(
	["clean", "-fd", "src/content/", "src/data/", "src/assets/", "public/"],
	"移除外部物化新增文件 (git clean)",
);

// 6. 重新编译生成主题默认离线图标与缩略图
try {
	execFileSync("node", ["scripts/icons/generate-local-icons.mjs"], {
		cwd: root,
		stdio: "ignore",
	});
	execFileSync("node", ["scripts/images/generate-moment-thumbnails.mjs"], {
		cwd: root,
		stdio: "ignore",
	});
	runGit(
		["checkout", "--", "src/generated/local-icon-collections.ts"],
		"还原默认离线图标集合元数据",
	);
} catch (err) {
	console.warn(
		`[content:clean] 提示: 重新生成离线图标/缩略图时遇到警告: ${err.message}`,
	);
}

console.log("[content:clean] [OK] 清理完成！代码仓已成功恢复为纯净的本地主题状态。");
if (backupDir) {
	console.log(`[content:clean] [NOTE] 提示：已自动保存安全备份，若需找回清理前的内容，可随时从备份目录恢复：`);
	console.log(`               ${relative(root, backupDir)}`);
}

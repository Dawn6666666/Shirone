import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const CLI_SCRIPT = fileURLToPath(
	new URL("../../scripts/content/cli.mjs", import.meta.url),
);

function runCli(args = [], { cwd } = {}) {
	const result = spawnSync(process.execPath, [CLI_SCRIPT, ...args], {
		cwd,
		encoding: "utf8",
		env: { ...process.env, SHIRONE_CONTENT_SYNC: "0" },
	});
	return {
		status: result.status,
		stdout: result.stdout ?? "",
		stderr: result.stderr ?? "",
		output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
	};
}

describe("content CLI 总入口与帮助指令", () => {
	it("无参数、--help、-h 或 help 时打印全景帮助文档", () => {
		for (const flag of [[], ["--help"], ["-h"], ["help"]]) {
			const res = runCli(flag);
			assert.equal(res.status, 0);
			assert.match(res.stdout, /Shirone 内容体系工具链/);
			assert.match(res.stdout, /sync/);
			assert.match(res.stdout, /clean/);
			assert.match(res.stdout, /export/);
			assert.match(res.stdout, /eject/);
			assert.match(res.stdout, /watch/);
			assert.match(res.stdout, /validate/);
			assert.match(res.stdout, /四维闭环关系/);
		}
	});

	it("未知指令报错并退出码 1，同时打印可用指令指引", () => {
		const res = runCli(["unknown-cmd"]);
		assert.equal(res.status, 1);
		assert.match(res.stderr, /未知指令: "unknown-cmd"/);
		assert.match(res.stdout, /可用指令：/);
	});

	it("子命令分发：clean 预演透传", () => {
		const res = runCli(["clean", "--dry-run"]);
		assert.equal(res.status, 0);
		assert.match(res.stdout, /预演模式/);
	});

	it("子命令分发：export 预演透传", () => {
		const res = runCli(["export", "--dry-run"]);
		// local 模式下 export 预演会提示 local 模式
		assert.match(res.output, /预演模式|local/);
	});

	it("子命令分发：validate 透传", () => {
		const res = runCli(["validate"]);
		assert.equal(res.status, 0);
	});

	it("子命令分发：status 诊断输出", () => {
		const root = mkdtempSync(join(tmpdir(), "shirone-content-cli-"));
		try {
			const userDirectory = join(root, "src/user");
			mkdirSync(userDirectory, { recursive: true });
			writeFileSync(
				join(userDirectory, "user-config.ts"),
				"export const userConfigOverrides = {};\nexport const userConfigSources = [];\n",
			);
			const res = runCli(["status"], { cwd: root });
			assert.equal(res.status, 0);
			assert.match(res.stdout, /Shirone 内容分离体系状态与连通性详细诊断报告/);
			assert.match(res.stdout, /运行模式与决策溯源/);
			assert.match(res.stdout, /内容源连通性与 Git 状态/);
			assert.match(res.stdout, /代码仓物化状态、锁文件与新旧一致性/);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	it("各具体子脚本均支持 --help", () => {
		for (const sub of ["status", "sync", "clean", "export", "eject"]) {
			const res = runCli([sub, "--help"]);
			assert.equal(res.status, 0, `subcommand ${sub} should exit 0 on --help`);
			assert.match(res.output, /用法：/);
		}
	});

	it("所有公开子命令都拒绝未知参数", () => {
		for (const sub of [
			"status",
			"sync",
			"clean",
			"export",
			"eject",
			"watch",
			"validate",
		]) {
			const res = runCli([sub, "--definitely-unknown"]);
			assert.equal(
				res.status,
				1,
				`subcommand ${sub} should reject unknown args`,
			);
			assert.match(res.output, /不支持参数/);
		}
	});
});

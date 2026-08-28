/**
 * Shirone 内容体系统一 CLI 分发器与帮助入口。
 *
 * 用法：
 *   pnpm content --help                     # 查看全套指令说明与四维闭环关系
 *   pnpm content status [--remote]           # 检查内容连接与物化新旧状态
 *   pnpm content sync [args...]             # 等同于 pnpm content:sync
 *   pnpm content clean [args...]            # 等同于 pnpm content:clean
 *   pnpm content export [args...]           # 等同于 pnpm content:export
 *   pnpm content eject [args...]            # 等同于 pnpm content:eject
 *   pnpm content watch [args...]            # 等同于 pnpm content:watch
 *   pnpm content validate [args...]         # 等同于 pnpm content:validate
 */

import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = fileURLToPath(new URL(".", import.meta.url));
const args = process.argv.slice(2);
const command = args[0];

const COMMAND_MAP = {
	status: {
		script: join(DIR, "status.mjs"),
		extraArgs: [],
		description: "状态诊断：检查内容源、Git、配置类型、锁文件与物化新旧状态",
	},
	sync: {
		script: join(DIR, "sync.mjs"),
		extraArgs: [],
		description: "物化内容：将独立内容仓目录增量同步到代码仓，并编译配置覆盖",
	},
	clean: {
		script: join(DIR, "clean.mjs"),
		extraArgs: [],
		description:
			"安全清理：还原被物化内容，重置配置覆盖（默认预演，--yes 执行）",
	},
	export: {
		script: join(DIR, "export.mjs"),
		extraArgs: [],
		description:
			"反向导出：将代码仓侧的改动与配置差分回写内容仓（默认预演，--yes 执行）",
	},
	eject: {
		script: join(DIR, "eject.mjs"),
		extraArgs: [],
		description: "一键解耦：将单仓迁移为独立内容仓架构（默认预演，--yes 执行）",
	},
	watch: {
		script: join(DIR, "sync.mjs"),
		extraArgs: ["--watch"],
		description: "监听模式：实时监听本地内容目录，保存时自动增量物化",
	},
	validate: {
		script: join(DIR, "sync.mjs"),
		extraArgs: ["--dry-run"],
		description: "结构预检：校验内容源结构、冲突与 YAML 类型（不写盘）",
	},
};

function printHelp() {
	console.log(
		[
			"Shirone 内容体系工具链 (Content Separation CLI)",
			"",
			"用法：",
			"  pnpm content <command> [options]",
			"  pnpm content:<command> [options]",
			"",
			"可用指令：",
			`  status    ${COMMAND_MAP.status.description}`,
			`  sync      ${COMMAND_MAP.sync.description}`,
			`  clean     ${COMMAND_MAP.clean.description}`,
			`  export    ${COMMAND_MAP.export.description}`,
			`  eject     ${COMMAND_MAP.eject.description}`,
			`  watch     ${COMMAND_MAP.watch.description}`,
			`  validate  ${COMMAND_MAP.validate.description}`,
			"",
			"四维闭环关系：",
			"  内容仓 ──content:sync──▶ 代码仓          物化",
			"  内容仓 ◀──content:export── 代码仓        反向导出",
			"  代码仓 ──content:clean──▶ 主题自带态      清理",
			"  内容仓 ◀──content:eject── 代码仓          一次性迁出",
			"",
			"帮助指引：",
			"  查看具体子指令帮助：pnpm content <command> --help",
			"  完整文档说明参见：docs/content-separation.md",
		].join("\n"),
	);
}

if (
	!command ||
	command === "--help" ||
	command === "-h" ||
	command === "help"
) {
	printHelp();
	process.exit(0);
}

const target = COMMAND_MAP[command];
if (!target) {
	console.error(`[content] 未知指令: "${command}"\n`);
	printHelp();
	process.exit(1);
}

const restArgs = args.slice(1);
const forwardedArgs = [...target.extraArgs, ...restArgs];

const result = spawnSync(process.execPath, [target.script, ...forwardedArgs], {
	stdio: "inherit",
	env: process.env,
});

if (result.error) {
	console.error(`[content] 启动子进程失败: ${result.error.message}`);
	process.exit(1);
}

if (result.signal) {
	console.error(`[content] 子指令被信号 ${result.signal} 终止。`);
}
process.exit(result.status ?? 1);

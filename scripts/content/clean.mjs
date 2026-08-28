/**
 * 内容清理脚本：一键清理所有从独立内容仓物化到代码仓的文件与配置覆盖，恢复纯净状态。
 *
 * 用法：
 *   node scripts/content/clean.mjs
 */

import { execFileSync } from "node:child_process";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
	FOOTER_HTML_TARGET,
	GENERATED_CONFIG_FILE,
} from "./config-domains.mjs";
import { EMPTY_MODULE } from "./config-overlay.mjs";
import { LOCK_FILE, WORKING_COPY_DIR } from "./resolve-source.mjs";

const root = process.cwd();

console.log("[content:clean] 正在清理物化文件与配置覆盖...");

// 1. 重置生成的用户配置与页脚覆盖
const userConfigFile = join(root, GENERATED_CONFIG_FILE);
writeFileSync(userConfigFile, EMPTY_MODULE, "utf8");

const footerTarget = join(root, FOOTER_HTML_TARGET);
if (existsSync(footerTarget)) {
	try {
		execFileSync("git", ["checkout", "--", FOOTER_HTML_TARGET], {
			cwd: root,
			stdio: "ignore",
		});
	} catch {
		// 忽略
	}
}

// 2. 清理 lock 文件与 git 工作副本
const lockFile = join(root, LOCK_FILE);
if (existsSync(lockFile)) {
	rmSync(lockFile, { force: true });
}

const workingCopy = join(root, WORKING_COPY_DIR);
if (existsSync(workingCopy)) {
	rmSync(workingCopy, { recursive: true, force: true });
}

// 3. 通过 git 恢复被修改的主题自带文件，并清理外部物化带来的未跟踪文件
try {
	execFileSync("git", ["checkout", "--", "src/", "public/"], {
		cwd: root,
		stdio: "ignore",
	});
	execFileSync(
		"git",
		["clean", "-fd", "src/content/", "src/data/", "public/"],
		{
			cwd: root,
			stdio: "ignore",
		},
	);
} catch (err) {
	console.warn(`[content:clean] git 清理警告: ${err.message}`);
}

// 4. 重新生成默认离线图标
try {
	execFileSync("node", ["scripts/icons/generate-local-icons.mjs"], {
		cwd: root,
		stdio: "ignore",
	});
} catch {
	// 忽略
}

console.log("[content:clean] 清理完成，代码仓已恢复为纯净的本地主题状态。");

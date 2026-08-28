/**
 * 内容物化：把内容仓库的目录同步到代码仓的标准路径，之后构建链保持完全不变。
 *
 * 设计要点见 `docs/content-separation.md`：
 * - `local` 模式下本脚本是空操作，主题自带内容的行为不受任何影响；
 * - 采用「物化」而非让 Astro 直读内容仓，是因为 `import.meta.glob` 的静态基准是 `src/`，
 *   且 `astro.config.mjs` 会在 Vite 插件链生效前同步 import 配置；
 * - 裁剪按「顶层段」限定，只清理内容仓确实拥有的那部分目录，
 *   避免误删主题自有资产（如 `public/favicon/`）与构建期生成物。
 *
 * 用法：
 *   node scripts/content/sync.mjs [--dry-run] [--watch] [--no-prune] [--quiet]
 */

import { execFileSync } from "node:child_process";
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	readdirSync,
	rmdirSync,
	rmSync,
	statSync,
	utimesSync,
	watch,
	writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { CONFIG_DIRECTORY } from "./config-domains.mjs";
import { syncUserConfig } from "./config-overlay.mjs";
import {
	LOCK_FILE,
	matchesAny,
	PROTECTED_PATHS,
	redactUrl,
	resolveContentSource,
	toPosix,
	topSegment,
	WORKING_COPY_DIR,
} from "./resolve-source.mjs";

const ROOT = process.cwd();

/** 遍历内容仓时始终跳过的目录名。 */
const SKIPPED_DIRECTORIES = new Set([".git", "node_modules"]);

/**
 * 内容仓根目录下允许存在、但不走挂载表的目录名（不产生告警）。
 *
 * `config/` 不是普通拷贝：它会被编译成 `src/user/user-config.ts`，见 config-overlay.mjs。
 */
const NON_CONTENT_DIRECTORIES = new Set([
	".git",
	".github",
	".vscode",
	CONFIG_DIRECTORY,
	"docs",
	"node_modules",
	"scripts",
	"templates",
]);

const args = new Set(process.argv.slice(2));
const options = {
	dryRun: args.has("--dry-run"),
	watchMode: args.has("--watch"),
	prune: !args.has("--no-prune"),
	quiet: args.has("--quiet"),
	help: args.has("--help") || args.has("-h"),
};

if (options.help) {
	console.log(
		[
			"用法：node scripts/content/sync.mjs [--dry-run] [--watch] [--no-prune] [--quiet]",
			"",
			"  （无参数）    将内容仓目录物化到代码仓标准路径，并编译配置覆盖",
			"  --dry-run     预演：只校验结构与冲突，不向磁盘写入任何文件",
			"  --watch       监听模式：实时监听本地内容目录，保存时自动触发增量物化",
			"  --no-prune    保留代码仓中已不存在于内容仓的文件（不执行裁剪）",
			"  --quiet       静默输出，仅报告错误与警告",
		].join("\n"),
	);
	process.exit(0);
}

function log(message) {
	if (!options.quiet) console.log(`[content] ${message}`);
}

function warn(message) {
	console.warn(`[content] ${message}`);
}

/** 收集目录下全部文件，返回以 `/` 分隔的相对路径。 */
function collectFiles(directory, prefix = "", accumulator = []) {
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		if (SKIPPED_DIRECTORIES.has(entry.name)) continue;
		const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
		if (entry.isDirectory()) {
			collectFiles(join(directory, entry.name), relativePath, accumulator);
		} else if (entry.isFile()) {
			accumulator.push(relativePath);
		}
	}
	return accumulator;
}

/** 收集目录下全部子目录（深度优先，父目录在前）。 */
function collectDirectories(directory, prefix = "", accumulator = []) {
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		if (!entry.isDirectory() || SKIPPED_DIRECTORIES.has(entry.name)) continue;
		const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
		accumulator.push(relativePath);
		collectDirectories(join(directory, entry.name), relativePath, accumulator);
	}
	return accumulator;
}

/**
 * 允许的 mtime 偏差（毫秒）。
 *
 * `utimesSync` 回写时会把源文件的亚毫秒精度四舍五入到毫秒，
 * 因此复制后两侧的 mtime 可以相差不到 1ms，不能按精确值比较。
 */
const MTIME_TOLERANCE_MS = 1;

function needsCopy(sourcePath, targetPath) {
	if (!existsSync(targetPath)) return true;
	const source = statSync(sourcePath);
	const target = statSync(targetPath);
	return (
		source.size !== target.size ||
		Math.abs(source.mtimeMs - target.mtimeMs) > MTIME_TOLERANCE_MS
	);
}

function copyPreservingMtime(sourcePath, targetPath) {
	mkdirSync(dirname(targetPath), { recursive: true });
	copyFileSync(sourcePath, targetPath);
	const source = statSync(sourcePath);
	utimesSync(targetPath, source.atime, source.mtime);
}

function runGit(gitArgs, { cwd = ROOT, redact } = {}) {
	try {
		return execFileSync("git", gitArgs, {
			cwd,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "pipe"],
			env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
		}).trim();
	} catch (error) {
		const detail = `${error.stderr ?? ""}${error.stdout ?? ""}`.trim();
		const safeArgs = gitArgs
			.map((value) => (value === redact ? redactUrl(value) : value))
			.join(" ");
		throw new Error(
			`git ${safeArgs} 执行失败：${redactUrl(detail) || error.message}`,
		);
	}
}

/**
 * 准备 `type: "git"` 内容源的工作副本。
 *
 * 用 `init + fetch --depth 1 <ref>` 而不是 `clone --branch`，
 * 这样分支、标签和具体 commit SHA 可以走同一条路径（回滚时需要按 SHA 取内容）。
 */
function ensureWorkingCopy(source) {
	const workingCopy = join(ROOT, WORKING_COPY_DIR);
	const allowFetch = process.env.CONTENT_SYNC_PULL !== "false";
	const isInitialized = existsSync(join(workingCopy, ".git"));

	if (!isInitialized) {
		rmSync(workingCopy, { recursive: true, force: true });
		mkdirSync(workingCopy, { recursive: true });
		runGit(["init", "--quiet"], { cwd: workingCopy });
		runGit(["remote", "add", "origin", source.url], {
			cwd: workingCopy,
			redact: source.url,
		});
	}

	if (!isInitialized || allowFetch) {
		log(`拉取内容仓 ${redactUrl(source.url)} @ ${source.ref}`);
		runGit(["fetch", "--depth", "1", "--force", "origin", source.ref], {
			cwd: workingCopy,
			redact: source.url,
		});
		runGit(["checkout", "--detach", "--force", "FETCH_HEAD"], {
			cwd: workingCopy,
		});
		runGit(["clean", "-ffdx"], { cwd: workingCopy });
	}

	return {
		directory: workingCopy,
		commit: runGit(["rev-parse", "HEAD"], { cwd: workingCopy }),
	};
}

function resolveSourceRoot(resolved) {
	if (resolved.source.type === "path") {
		const directory = resolve(ROOT, resolved.source.path);
		if (!existsSync(directory)) {
			throw new Error(
				`内容目录不存在：${directory}（来源：${resolved.source.origin}）`,
			);
		}
		return { directory, commit: null };
	}
	return ensureWorkingCopy(resolved.source);
}

/** 报告内容仓里既没被挂载、也不属于约定元目录的顶层目录。 */
function warnUnmountedDirectories(sourceRoot, mounts) {
	for (const entry of readdirSync(sourceRoot, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		if (mounts[entry.name] || NON_CONTENT_DIRECTORIES.has(entry.name)) continue;
		warn(
			`内容仓的 ${entry.name}/ 没有对应挂载点，本次不会同步。` +
				" 如需同步，请在 shirone.content.json 的 mounts 中声明。",
		);
	}
}

/**
 * 同步单个挂载点。
 *
 * @returns {{copied: number, removed: number, files: number}}
 */
function syncMount(sourceRoot, sourceDir, targetDir, resolved) {
	const sourceAbsolute = join(sourceRoot, sourceDir);
	const targetAbsolute = join(ROOT, targetDir);

	const sourceFiles = collectFiles(sourceAbsolute);
	const sourceFileSet = new Set(sourceFiles);
	// 只有内容仓真正拥有的顶层段才参与裁剪，主题自有目录因此天然免疫。
	const ownedSegments = new Set(sourceFiles.map(topSegment));

	let copied = 0;
	for (const relativePath of sourceFiles) {
		const repoRelative = `${targetDir}/${relativePath}`;
		if (matchesAny(repoRelative, PROTECTED_PATHS)) {
			throw new Error(
				`内容仓试图写入构建期生成物路径 ${repoRelative}，请从内容仓移除该文件。`,
			);
		}
		if (matchesAny(repoRelative, resolved.keep)) {
			throw new Error(
				`${repoRelative} 已在 shirone.content.json 的 keep 中声明为代码仓自有，` +
					" 但内容仓也提供了同名文件。请二选一。",
			);
		}

		const sourcePath = join(sourceAbsolute, relativePath);
		const targetPath = join(targetAbsolute, relativePath);
		if (!needsCopy(sourcePath, targetPath)) continue;
		if (!options.dryRun) copyPreservingMtime(sourcePath, targetPath);
		copied += 1;
	}

	let removed = 0;
	if (options.prune && resolved.prune && existsSync(targetAbsolute)) {
		for (const relativePath of collectFiles(targetAbsolute)) {
			if (sourceFileSet.has(relativePath)) continue;
			if (!ownedSegments.has(topSegment(relativePath))) continue;
			const repoRelative = `${targetDir}/${relativePath}`;
			if (matchesAny(repoRelative, PROTECTED_PATHS)) continue;
			if (matchesAny(repoRelative, resolved.keep)) continue;
			if (!options.dryRun) rmSync(join(targetAbsolute, relativePath));
			removed += 1;
		}

		if (!options.dryRun) {
			// 自底向上清理裁剪后留下的空目录，同样只限内容仓拥有的顶层段。
			const directories = collectDirectories(targetAbsolute).reverse();
			for (const relativePath of directories) {
				if (!ownedSegments.has(topSegment(relativePath))) continue;
				const absolute = join(targetAbsolute, relativePath);
				if (readdirSync(absolute).length > 0) continue;
				rmdirSync(absolute);
			}
		}
	}

	return { copied, removed, files: sourceFiles.length };
}

function writeLockFile(resolved, sourceRoot, commit, mountStats, configFiles) {
	const lock = {
		schemaVersion: resolved.schemaVersion,
		syncedAt: new Date().toISOString(),
		source:
			resolved.source.type === "git"
				? {
						type: "git",
						url: redactUrl(resolved.source.url),
						ref: resolved.source.ref,
						commit,
					}
				: { type: "path", path: toPosix(sourceRoot) },
		mounts: mountStats,
		config: configFiles,
	};
	if (!options.dryRun) {
		writeFileSync(join(ROOT, LOCK_FILE), `${JSON.stringify(lock, null, 2)}\n`);
	}
	return lock;
}

function runSync() {
	const resolved = resolveContentSource(ROOT);
	if (resolved.mode === "local") {
		// 主题自带内容：保持静默，`pnpm dev` / `pnpm build` 的输出不受影响。
		return null;
	}

	const { directory: sourceRoot, commit } = resolveSourceRoot(resolved);
	warnUnmountedDirectories(sourceRoot, resolved.mounts);

	const mountStats = {};
	let totalCopied = 0;
	let totalRemoved = 0;
	const skipped = [];

	for (const [sourceDir, targetDir] of Object.entries(resolved.mounts)) {
		if (!existsSync(join(sourceRoot, sourceDir))) {
			skipped.push(sourceDir);
			continue;
		}
		const stats = syncMount(sourceRoot, sourceDir, targetDir, resolved);
		mountStats[targetDir] = stats;
		totalCopied += stats.copied;
		totalRemoved += stats.removed;
	}

	// 配置覆盖必须在挂载之后：类型校验会读到内容仓刚物化过来的 src/data/*.ts。
	const config = syncUserConfig({
		root: ROOT,
		sourceRoot,
		dryRun: options.dryRun,
		warn,
	});

	if (Object.keys(mountStats).length === 0 && config.files.length === 0) {
		throw new Error(
			`内容源 ${sourceRoot} 中没有任何可挂载目录（期望之一：${Object.keys(resolved.mounts).join(", ")}、${CONFIG_DIRECTORY}）。`,
		);
	}

	const lock = writeLockFile(
		resolved,
		sourceRoot,
		commit,
		mountStats,
		config.files,
	);
	const totalFiles = Object.values(mountStats).reduce(
		(sum, stats) => sum + stats.files,
		0,
	);

	log(
		`${options.dryRun ? "[dry-run] " : ""}物化 ${totalFiles} 个文件` +
			`（更新 ${totalCopied}，清理 ${totalRemoved}）` +
			`${config.files.length > 0 ? `，配置覆盖 ${config.files.length} 个${config.changed ? "（已更新）" : ""}` : ""}` +
			`${commit ? `，内容 commit ${commit.slice(0, 8)}` : ""}`,
	);
	if (skipped.length > 0) {
		log(`内容仓未提供以下目录，对应代码仓路径保持不变：${skipped.join(", ")}`);
	}
	return lock;
}

function runWatch() {
	const resolved = resolveContentSource(ROOT);
	if (resolved.mode === "local") return;
	if (resolved.source.type !== "path") {
		throw new Error(`--watch 仅支持 source.type = "path" 的本地内容目录。`);
	}
	const sourceRoot = resolve(ROOT, resolved.source.path);
	log(`监听 ${sourceRoot}，按 Ctrl+C 结束`);

	let timer = null;
	watch(sourceRoot, { recursive: true }, () => {
		if (timer) clearTimeout(timer);
		timer = setTimeout(() => {
			try {
				runSync();
			} catch (error) {
				console.error(`[content] ${error.message}`);
			}
		}, 150);
	});
}

try {
	runSync();
	if (options.watchMode) runWatch();
} catch (error) {
	console.error(`[content] ${error.message}`);
	process.exitCode = 1;
}

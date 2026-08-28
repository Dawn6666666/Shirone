/**
 * 内容分离状态诊断。
 *
 * 默认只检查本地配置、工作副本与物化结果，不发起网络请求。传入 --remote 时才会
 * 使用 git ls-remote 验证远端 ref。所有 Git 命令都禁用 optional locks，避免刷新 index。
 *
 * 用法：
 *   node scripts/content/status.mjs [--remote]
 */

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import ts from "typescript";
import {
	CONFIG_DIRECTORY,
	CONFIG_DOMAINS,
	FOOTER_HTML_SOURCE,
	GENERATED_CONFIG_FILE,
} from "./config-domains.mjs";
import {
	EMPTY_MODULE,
	generateModule,
	readConfigOverrides,
} from "./config-overlay.mjs";
import {
	canonicalGitUrl,
	DEFAULT_MOUNTS,
	LOCK_FILE,
	MANIFEST_FILE,
	matchesAny,
	PROTECTED_PATHS,
	redactUrl,
	resolveContentSource,
	toPosix,
	topSegment,
	WORKING_COPY_DIR,
} from "./resolve-source.mjs";

const ROOT = process.cwd();
const args = process.argv.slice(2);
const options = {
	help: args.includes("--help") || args.includes("-h"),
	remote: args.includes("--remote"),
};
const unknownArgs = args.filter(
	(argument) => !["--help", "-h", "--remote"].includes(argument),
);

if (options.help) {
	console.log(
		[
			"用法：node scripts/content/status.mjs [--remote]",
			"",
			"详细诊断内容源、Git、本地工作副本、挂载资产、配置覆盖、锁文件与物化新旧状态。",
			"默认完全离线且只读；--remote 额外使用 git ls-remote 验证远端 ref。",
			"发现阻断构建或需要重新同步的问题时退出码为 1，只有告警时仍为 0。",
		].join("\n"),
	);
	process.exit(0);
}

if (unknownArgs.length > 0) {
	console.error(`[content] status 不支持参数：${unknownArgs.join("、")}`);
	process.exit(1);
}

const findings = [];
const scanCache = new Map();

function addFinding(severity, message) {
	findings.push({ severity, message });
}

function addError(message) {
	addFinding("error", message);
}

function addWarning(message) {
	addFinding("warning", message);
}

function formatBytes(bytes) {
	if (bytes < 1024) return `${bytes} B`;
	const units = ["KB", "MB", "GB", "TB"];
	let value = bytes / 1024;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit += 1;
	}
	return `${value.toFixed(1)} ${units[unit]}`;
}

function normalizeText(value) {
	return value
		.replace(/^\uFEFF/, "")
		.split("\r\n")
		.join("\n");
}

function normalizePathForCompare(value) {
	const normalized = toPosix(resolve(value)).replace(/\/$/, "");
	return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function safeErrorText(error) {
	const detail = `${error.stderr ?? ""}${error.stdout ?? ""}`.trim();
	return redactUrl(detail || error.message || String(error));
}

function runGit(gitArgs, cwd = ROOT, { timeout = 10_000 } = {}) {
	try {
		const output = execFileSync(
			"git",
			["--no-optional-locks", "-c", "core.quotepath=false", ...gitArgs],
			{
				cwd,
				encoding: "utf8",
				stdio: ["ignore", "pipe", "pipe"],
				timeout,
				env: {
					...process.env,
					GIT_OPTIONAL_LOCKS: "0",
					GIT_TERMINAL_PROMPT: "0",
				},
			},
		);
		return { ok: true, output: output.trim() };
	} catch (error) {
		return {
			ok: false,
			error: safeErrorText(error),
			notFound: error.code === "ENOENT",
			status: error.status,
		};
	}
}

function inspectDirectory(directory) {
	if (!existsSync(directory)) return { exists: false, isDirectory: false };
	try {
		return { exists: true, isDirectory: statSync(directory).isDirectory() };
	} catch (error) {
		return { exists: true, isDirectory: false, error: error.message };
	}
}

function scanDirectory(directory) {
	const cached = scanCache.get(directory);
	if (cached) return cached;

	const files = [];
	const errors = [];
	function walk(current, prefix = "") {
		let entries;
		try {
			entries = readdirSync(current, { withFileTypes: true });
		} catch (error) {
			errors.push(`${current}: ${error.message}`);
			return;
		}

		for (const entry of entries) {
			if (entry.name === ".git" || entry.name === "node_modules") continue;
			const absolute = join(current, entry.name);
			const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
			if (entry.isDirectory()) {
				walk(absolute, relativePath);
				continue;
			}
			if (!entry.isFile()) continue;
			try {
				const stat = statSync(absolute);
				files.push({
					absolute,
					relative: relativePath,
					size: stat.size,
					mtimeMs: stat.mtimeMs,
				});
			} catch (error) {
				errors.push(`${absolute}: ${error.message}`);
			}
		}
	}

	walk(directory);
	const result = {
		count: files.length,
		totalBytes: files.reduce((sum, file) => sum + file.size, 0),
		files,
		errors,
	};
	scanCache.set(directory, result);
	return result;
}

function inspectGitRepository(directory) {
	const markerExists = existsSync(join(directory, ".git"));
	const inside = runGit(["rev-parse", "--is-inside-work-tree"], directory);
	if (!inside.ok || inside.output !== "true") {
		return {
			isGit: false,
			invalidMarker: markerExists,
			unavailable: inside.notFound,
			error: inside.error,
		};
	}

	const branch = runGit(["branch", "--show-current"], directory);
	const log = runGit(
		["log", "-1", "--format=%H%x00%h%x00%an%x00%aI%x00%s"],
		directory,
	);
	const status = runGit(["status", "--porcelain=v1", "-uall"], directory);
	const commandErrors = [branch, log, status]
		.filter((result) => !result.ok)
		.map((result) => result.error);
	let commit = null;
	let shortCommit = null;
	let author = null;
	let date = null;
	let subject = null;
	if (log.ok && log.output) {
		[commit, shortCommit, author, date, subject] = log.output.split("\0");
	}

	return {
		isGit: true,
		branch: branch.ok ? branch.output || "(detached HEAD)" : "未知",
		commit,
		shortCommit,
		author,
		date,
		subject,
		dirty: status.ok ? status.output !== "" : null,
		changes: status.ok
			? status.output.split("\n").filter(Boolean).length
			: null,
		commandErrors,
	};
}

function printGitRepository(repository, label = "Git 仓库") {
	if (!repository.isGit) return;
	console.log(`  ${label}：有效工作树`);
	console.log(`  分支名称：${repository.branch}`);
	if (repository.commit) {
		console.log(
			`  最新提交：${repository.shortCommit} - ${repository.subject || "(无主题)"}`,
		);
		console.log(
			`  提交者与时间：${repository.author || "未知"}，${repository.date || "未知"}`,
		);
	} else {
		console.log("  最新提交：无提交记录");
	}
	if (repository.dirty === null) {
		console.log("  工作区状态：无法读取");
	} else if (repository.dirty) {
		console.log(`  工作区状态：有 ${repository.changes} 处未提交改动`);
	} else {
		console.log("  工作区状态：干净 (Clean)");
	}
}

function compareMount(
	sourceSnapshot,
	targetDirectory,
	resolvedSource,
	shouldPrune,
) {
	const differences = [];
	const target = inspectDirectory(targetDirectory);
	if (!target.exists || !target.isDirectory) {
		return [`目标目录不存在或不是目录：${targetDirectory}`];
	}

	const sourceFiles = new Set(
		sourceSnapshot.files.map((file) => file.relative),
	);
	const ownedSegments = new Set(
		sourceSnapshot.files.map((file) => topSegment(file.relative)),
	);
	for (const sourceFile of sourceSnapshot.files) {
		const targetFile = join(targetDirectory, sourceFile.relative);
		try {
			const targetStat = statSync(targetFile);
			if (
				!targetStat.isFile() ||
				targetStat.size !== sourceFile.size ||
				Math.abs(targetStat.mtimeMs - sourceFile.mtimeMs) > 1
			) {
				differences.push(sourceFile.relative);
			}
		} catch {
			differences.push(sourceFile.relative);
		}
	}

	const targetSnapshot = scanDirectory(targetDirectory);
	for (const error of targetSnapshot.errors)
		differences.push(`扫描失败 ${error}`);
	if (!shouldPrune) return differences;
	for (const targetFile of targetSnapshot.files) {
		if (sourceFiles.has(targetFile.relative)) continue;
		if (!ownedSegments.has(topSegment(targetFile.relative))) continue;
		const repositoryRelative = toPosix(relative(ROOT, targetFile.absolute));
		if (matchesAny(repositoryRelative, PROTECTED_PATHS)) continue;
		if (matchesAny(repositoryRelative, resolvedSource.keep || [])) continue;
		differences.push(`多余文件 ${targetFile.relative}`);
	}
	return differences;
}

function arraysEqual(left, right) {
	const sortedLeft = [...left].sort();
	const sortedRight = [...right].sort();
	return (
		sortedLeft.length === sortedRight.length &&
		sortedLeft.every((value, index) => value === sortedRight[index])
	);
}

function isSemanticallyEmptyConfig(source) {
	const sourceFile = ts.createSourceFile(
		GENERATED_CONFIG_FILE,
		source,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TS,
	);
	let emptyOverrides = false;
	let emptySources = false;
	for (const statement of sourceFile.statements) {
		if (!ts.isVariableStatement(statement)) continue;
		for (const declaration of statement.declarationList.declarations) {
			if (!ts.isIdentifier(declaration.name) || !declaration.initializer)
				continue;
			if (
				declaration.name.text === "userConfigOverrides" &&
				ts.isObjectLiteralExpression(declaration.initializer) &&
				declaration.initializer.properties.length === 0
			) {
				emptyOverrides = true;
			}
			if (
				declaration.name.text === "userConfigSources" &&
				ts.isArrayLiteralExpression(declaration.initializer) &&
				declaration.initializer.elements.length === 0
			) {
				emptySources = true;
			}
		}
	}
	return emptyOverrides && emptySources;
}

function inspectGeneratedConfig(path) {
	if (!existsSync(path)) return { state: "missing", source: null };
	try {
		const source = readFileSync(path, "utf8");
		if (isSemanticallyEmptyConfig(source)) return { state: "empty", source };
		if (
			source.includes("userConfigOverrides") &&
			source.includes("userConfigSources") &&
			source.includes("pnpm content:sync")
		) {
			return { state: "materialized", source };
		}
		return { state: "modified", source };
	} catch (error) {
		return { state: "unreadable", source: null, error: error.message };
	}
}

function readLock(path) {
	if (!existsSync(path)) return { state: "missing", lock: null };
	try {
		const lock = JSON.parse(readFileSync(path, "utf8"));
		if (!lock || typeof lock !== "object" || Array.isArray(lock)) {
			throw new Error("顶层必须是对象");
		}
		if (!lock.source || typeof lock.source !== "object") {
			throw new Error("source 必须是对象");
		}
		if (!Number.isInteger(lock.schemaVersion) || lock.schemaVersion !== 1) {
			throw new Error(
				`不支持 schemaVersion ${JSON.stringify(lock.schemaVersion)}`,
			);
		}
		if (lock.source.type === "path") {
			if (typeof lock.source.path !== "string" || lock.source.path === "") {
				throw new Error("path 来源缺少 source.path");
			}
		} else if (lock.source.type === "git") {
			if (
				typeof lock.source.url !== "string" ||
				lock.source.url === "" ||
				typeof lock.source.ref !== "string" ||
				lock.source.ref === ""
			) {
				throw new Error("git 来源缺少 source.url 或 source.ref");
			}
		} else {
			throw new Error(`source.type 无效：${JSON.stringify(lock.source.type)}`);
		}
		if (
			lock.source.commit !== null &&
			lock.source.commit !== undefined &&
			typeof lock.source.commit !== "string"
		) {
			throw new Error("source.commit 必须是字符串或 null");
		}
		if (
			!lock.mounts ||
			typeof lock.mounts !== "object" ||
			Array.isArray(lock.mounts)
		) {
			throw new Error("mounts 必须是对象");
		}
		if (!Array.isArray(lock.config)) {
			throw new Error("config 必须是数组");
		}
		if (lock.config.some((file) => typeof file !== "string")) {
			throw new Error("config 只能包含字符串路径");
		}
		if (
			typeof lock.syncedAt !== "string" ||
			Number.isNaN(Date.parse(lock.syncedAt))
		) {
			throw new Error("syncedAt 不是有效时间");
		}
		if (lock.prune !== undefined && typeof lock.prune !== "boolean") {
			throw new Error("prune 必须是布尔值");
		}
		return { state: "valid", lock };
	} catch (error) {
		return { state: "invalid", lock: null, error: error.message };
	}
}

function typeCheckConfigSource(source, lineOwners) {
	const tsconfigPath = join(ROOT, "tsconfig.json");
	const readResult = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
	if (readResult.error) {
		return [
			`无法读取 tsconfig.json：${ts.flattenDiagnosticMessageText(readResult.error.messageText, "\n")}`,
		];
	}

	const parsed = ts.parseJsonConfigFileContent(
		readResult.config,
		ts.sys,
		ROOT,
		{ noEmit: true, declaration: false, plugins: [] },
		tsconfigPath,
	);
	if (parsed.errors.length > 0) {
		return parsed.errors.map((diagnostic) =>
			ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
		);
	}

	const virtualPath = join(ROOT, GENERATED_CONFIG_FILE);
	const canonicalVirtual = normalizePathForCompare(virtualPath);
	const host = ts.createCompilerHost(parsed.options, true);
	const originalFileExists = host.fileExists.bind(host);
	const originalReadFile = host.readFile.bind(host);
	const originalGetSourceFile = host.getSourceFile.bind(host);
	host.fileExists = (fileName) =>
		normalizePathForCompare(fileName) === canonicalVirtual ||
		originalFileExists(fileName);
	host.readFile = (fileName) =>
		normalizePathForCompare(fileName) === canonicalVirtual
			? source
			: originalReadFile(fileName);
	host.getSourceFile = (fileName, languageVersion, onError, shouldCreate) => {
		if (normalizePathForCompare(fileName) === canonicalVirtual) {
			return ts.createSourceFile(
				fileName,
				source,
				languageVersion,
				true,
				ts.ScriptKind.TS,
			);
		}
		return originalGetSourceFile(
			fileName,
			languageVersion,
			onError,
			shouldCreate,
		);
	};

	const program = ts.createProgram([virtualPath], parsed.options, host);
	return ts
		.getPreEmitDiagnostics(program)
		.filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)
		.map((diagnostic) => {
			const message = ts.flattenDiagnosticMessageText(
				diagnostic.messageText,
				"\n",
			);
			if (
				diagnostic.file &&
				diagnostic.start !== undefined &&
				normalizePathForCompare(diagnostic.file.fileName) === canonicalVirtual
			) {
				const { line } = diagnostic.file.getLineAndCharacterOfPosition(
					diagnostic.start,
				);
				const owner = lineOwners[line];
				if (owner) {
					return `${owner.file} 的 ${owner.path || "顶层"}：${message}`;
				}
			}
			const file = diagnostic.file
				? toPosix(relative(ROOT, diagnostic.file.fileName))
				: "TypeScript";
			return `${file}：${message}`;
		});
}

function describeOrigin(source) {
	if ([".env", ".env.local"].includes(source.originLocation)) {
		return `根目录 ${source.originLocation} 中的 ${source.origin}`;
	}
	if (source.originLocation === "environment") {
		return `进程环境变量 ${source.origin}`;
	}
	return source.origin;
}

function describeRefOrigin(source) {
	if ([".env", ".env.local"].includes(source.refOrigin)) {
		return `根目录 ${source.refOrigin}`;
	}
	if (source.refOrigin === "environment") return "进程环境变量";
	if (source.refOrigin === "manifest") return MANIFEST_FILE;
	return "默认值 main";
}

console.log(
	"================================================================================",
);
console.log("             Shirone 内容分离体系状态与连通性详细诊断报告");
console.log(
	"================================================================================\n",
);

console.log("【1. 运行模式与决策溯源】");
const envFile = join(ROOT, ".env");
const envLocalFile = join(ROOT, ".env.local");
const manifestFile = join(ROOT, MANIFEST_FILE);
let resolved;
try {
	resolved = resolveContentSource(ROOT);
} catch (error) {
	resolved = { mode: "error", error: error.message };
	addError(`内容源配置无法解析：${error.message}`);
}

if (resolved.mode === "error") {
	console.log("  当前模式：配置错误 (ERROR)");
	console.log(`  错误原因：${resolved.error}`);
} else if (resolved.mode === "local") {
	console.log("  当前模式：local（使用代码仓自带内容）");
	console.log(`  判定依据：${resolved.reason}`);
	if (resolved.reasonLocation) {
		console.log(
			`  禁用来源：${[".env", ".env.local"].includes(resolved.reasonLocation) ? `根目录 ${resolved.reasonLocation}` : "进程环境变量"}`,
		);
	}
} else {
	console.log("  当前模式：external（已配置外部内容源，连接状态见下一节）");
	console.log(`  来源判定：${describeOrigin(resolved.source)}`);
}
console.log("  配置文件检查：");
console.log(`    - 根目录 .env：${existsSync(envFile) ? "存在" : "未创建"}`);
console.log(
	`    - 根目录 .env.local：${existsSync(envLocalFile) ? "存在" : "未创建"}`,
);
console.log(
	`    - 清单文件 ${MANIFEST_FILE}：${existsSync(manifestFile) ? "存在" : "未创建"}`,
);
console.log("");

console.log("【2. 内容源连通性与 Git 状态】");
let sourceRoot = null;
let sourceGit = null;
let currentCommit = null;

if (resolved.mode === "local") {
	console.log("  内容源：未启用外部内容源");
} else if (resolved.mode === "error") {
	console.log("  内容源：配置错误，无法继续连接诊断");
} else if (resolved.source.type === "path") {
	const sourceAbsolute = resolve(ROOT, resolved.source.path);
	const directory = inspectDirectory(sourceAbsolute);
	console.log('  接入类型：本地目录挂载 (type: "path")');
	console.log(`  配置路径：${resolved.source.path}`);
	console.log(`  绝对路径：${sourceAbsolute}`);
	if (!directory.exists) {
		console.log("  目录状态：失败（目录不存在）");
		addError(`内容目录不存在：${sourceAbsolute}`);
	} else if (!directory.isDirectory) {
		console.log("  目录状态：失败（路径不是目录或无法读取）");
		addError(`内容路径不是可读目录：${sourceAbsolute}`);
	} else {
		console.log("  目录状态：正常");
		sourceRoot = sourceAbsolute;
		sourceGit = inspectGitRepository(sourceAbsolute);
		if (sourceGit.isGit) {
			printGitRepository(sourceGit);
			currentCommit = sourceGit.commit;
			if (sourceGit.dirty) {
				addWarning("本地内容仓有未提交改动，锁定 commit 无法完全代表当前内容");
			}
			for (const error of sourceGit.commandErrors) {
				addWarning(`部分 Git 状态读取失败：${error}`);
			}
		} else if (sourceGit.unavailable) {
			console.log("  Git 仓库：无法检测（系统找不到 git）");
			addWarning("系统找不到 git，已跳过本地内容仓版本诊断");
		} else if (sourceGit.invalidMarker) {
			console.log(`  Git 仓库：无效（${sourceGit.error}）`);
			addError(`内容目录包含 .git，但不是有效 Git 工作树：${sourceGit.error}`);
		} else {
			console.log("  Git 仓库：否（受支持的普通本地目录）");
		}
	}
} else {
	const workingCopy = join(ROOT, WORKING_COPY_DIR);
	const directory = inspectDirectory(workingCopy);
	console.log('  接入类型：远端 Git 仓库工作副本 (type: "git")');
	console.log(`  仓库地址：${redactUrl(resolved.source.url)}`);
	console.log(`  目标 Ref：${resolved.source.ref}`);
	console.log(`  Ref 来源：${describeRefOrigin(resolved.source)}`);
	console.log(`  本地工作副本：${toPosix(relative(ROOT, workingCopy))}`);
	if (!directory.exists || !directory.isDirectory) {
		console.log("  副本状态：尚未初始化或路径无效");
		addError(
			`远端内容工作副本 ${WORKING_COPY_DIR}/ 尚未初始化，请先运行 content sync`,
		);
	} else {
		sourceGit = inspectGitRepository(workingCopy);
		if (sourceGit.unavailable) {
			console.log("  副本状态：无法检测（系统找不到 git）");
			addError("系统找不到 git，无法验证远端内容工作副本");
		} else if (!sourceGit.isGit) {
			console.log(`  副本状态：无效 Git 工作树（${sourceGit.error}）`);
			addError(`${WORKING_COPY_DIR}/ 不是有效 Git 工作树`);
		} else {
			sourceRoot = workingCopy;
			currentCommit = sourceGit.commit;
			printGitRepository(sourceGit, "工作副本");
			if (sourceGit.dirty) {
				addWarning("远端工作副本存在未提交改动，下一次 sync 会清理这些改动");
			}

			const origin = runGit(["remote", "get-url", "origin"], workingCopy);
			if (!origin.ok) {
				console.log(`  origin：读取失败（${origin.error}）`);
				addError("远端工作副本缺少可读取的 origin");
				sourceRoot = null;
			} else {
				console.log(`  origin：${redactUrl(origin.output)}`);
				if (
					canonicalGitUrl(origin.output) !==
					canonicalGitUrl(resolved.source.url)
				) {
					addError("远端工作副本 origin 与当前配置的仓库地址不一致");
					sourceRoot = null;
				}
			}

			const fetchHead = runGit(
				["rev-parse", "--verify", "FETCH_HEAD"],
				workingCopy,
			);
			if (!fetchHead.ok) {
				console.log(
					"  FETCH_HEAD：不存在，无法确认副本是否由 content sync 拉取",
				);
				addWarning("远端工作副本缺少 FETCH_HEAD，无法离线确认目标 ref");
			} else if (currentCommit !== fetchHead.output) {
				console.log(
					`  FETCH_HEAD：${fetchHead.output.slice(0, 8)}（与 HEAD 不一致）`,
				);
				addError("远端工作副本 HEAD 与最近一次 FETCH_HEAD 不一致");
			} else {
				console.log(
					`  FETCH_HEAD：${fetchHead.output.slice(0, 8)}（与 HEAD 一致）`,
				);
			}
		}
	}

	if (options.remote) {
		console.log("  远端实时探测：执行 git ls-remote");
		const remote = runGit(
			["ls-remote", "--exit-code", resolved.source.url, resolved.source.ref],
			ROOT,
			{ timeout: 15_000 },
		);
		if (!remote.ok || !remote.output) {
			console.log(
				`  远端实时探测：失败（${remote.error || "目标 ref 不存在"}）`,
			);
			addError(
				`远端仓库或目标 ref 无法访问：${remote.error || resolved.source.ref}`,
			);
		} else {
			const remoteCommit = remote.output.split(/\s/)[0];
			console.log(`  远端实时探测：正常 (${remoteCommit.slice(0, 8)})`);
			if (currentCommit && currentCommit !== remoteCommit) {
				addError("本地工作副本落后于当前远端目标 ref，请重新运行 content sync");
			}
		}
	} else {
		console.log("  远端实时探测：未执行（需要时传入 --remote）");
	}
}
console.log("");

console.log("【3. 内容仓资源与挂载点探测】");
const mountSnapshots = new Map();
if (!sourceRoot) {
	console.log("  内容仓不可用，跳过挂载点资源探测。\n");
} else {
	const mounts = resolved.mounts || DEFAULT_MOUNTS;
	console.log("  挂载目录映射与资产探测：");
	for (const [sourceDir, targetDir] of Object.entries(mounts)) {
		const absoluteSource = join(sourceRoot, sourceDir);
		const sourceDirectory = inspectDirectory(absoluteSource);
		if (!sourceDirectory.exists) {
			console.log(
				`    - ${sourceDir}/ -> ${targetDir}/：未提供，将保持代码仓目标目录不变`,
			);
			continue;
		}
		if (!sourceDirectory.isDirectory) {
			console.log(
				`    - ${sourceDir}/ -> ${targetDir}/：失败（源挂载点不是目录）`,
			);
			addError(`内容源挂载点 ${sourceDir} 不是目录`);
			continue;
		}

		const snapshot = scanDirectory(absoluteSource);
		mountSnapshots.set(sourceDir, snapshot);
		for (const error of snapshot.errors)
			addError(`无法完整扫描挂载点：${error}`);
		let detail = "";
		if (sourceDir === "content") {
			const markdown = snapshot.files.filter((file) =>
				/\.(?:md|mdx)$/i.test(file.relative),
			);
			const posts = markdown.filter((file) =>
				file.relative.startsWith("posts/"),
			);
			const moments = markdown.filter((file) =>
				file.relative.startsWith("moments/"),
			);
			detail = ` [Markdown 文章: ${posts.length} 篇, 说说: ${moments.length} 条]`;
		} else if (sourceDir === "data") {
			const dataFiles = snapshot.files
				.filter(
					(file) =>
						!file.relative.includes("/") &&
						/\.(?:ts|json)$/i.test(file.relative),
				)
				.map((file) => file.relative)
				.sort();
			detail = ` [包含: ${dataFiles.join(", ") || "无"}]`;
		}
		console.log(
			`    - ${sourceDir}/ -> ${targetDir}/：${snapshot.count} 个文件 (${formatBytes(snapshot.totalBytes)})${detail}`,
		);
	}
	console.log("");
}

console.log("【4. 配置覆盖层探测 (config/*.yaml)】");
const configState = {
	valid: true,
	entries: [],
	files: [],
	expectedSource: EMPTY_MODULE,
	lineOwners: [],
	footerPath: null,
};
if (!sourceRoot) {
	console.log("  内容仓不可用，跳过配置覆盖探测。\n");
} else {
	const configDirectory = join(sourceRoot, CONFIG_DIRECTORY);
	const directory = inspectDirectory(configDirectory);
	if (!directory.exists) {
		console.log("  config/ 目录：未提供，全部领域使用主题默认配置");
	} else if (!directory.isDirectory) {
		console.log("  config/ 目录：失败（路径不是目录）");
		configState.valid = false;
		addError("内容源 config 路径不是目录");
	} else {
		let rawFiles = [];
		try {
			rawFiles = readdirSync(configDirectory, { withFileTypes: true })
				.filter((entry) => entry.isFile() && /\.ya?ml$/.test(entry.name))
				.map((entry) => entry.name)
				.sort();
			configState.entries = readConfigOverrides(configDirectory);
			configState.files = configState.entries.map((entry) => entry.file);
			const generated = generateModule(configState.entries);
			configState.expectedSource = generated.source;
			configState.lineOwners = generated.lineOwners;
		} catch (error) {
			configState.valid = false;
			console.log(`  YAML 结构校验：失败（${error.message}）`);
			addError(`配置覆盖无法解析：${error.message}`);
		}

		const effectiveByDomain = new Map(
			configState.entries.map((entry) => [entry.domain.key, entry]),
		);
		console.log(`  发现 YAML 文件：${rawFiles.length} 个`);
		if (configState.valid) {
			for (const domain of CONFIG_DOMAINS) {
				const matching = rawFiles.filter(
					(file) =>
						file === `${domain.file}.yaml` || file === `${domain.file}.yml`,
				);
				const effective = effectiveByDomain.get(domain.key);
				if (effective) {
					const path = join(sourceRoot, effective.file);
					console.log(
						`    - ${effective.file} -> ${domain.type}：结构校验通过 (${formatBytes(statSync(path).size)})`,
					);
				} else if (matching.length > 0) {
					console.log(
						`    - config/${matching[0]} -> ${domain.type}：空文件或空映射，不产生覆盖`,
					);
				}
			}
			const missing = CONFIG_DOMAINS.filter(
				(domain) =>
					!rawFiles.includes(`${domain.file}.yaml`) &&
					!rawFiles.includes(`${domain.file}.yml`),
			).map((domain) => `${domain.file}.yaml (${domain.key})`);
			console.log(`  未提供领域 (${missing.length} 个，使用主题默认值)：`);
			console.log(`    ${missing.join(", ") || "无"}`);
			if (configState.entries.length > 0) {
				const typeErrors = typeCheckConfigSource(
					configState.expectedSource,
					configState.lineOwners,
				);
				if (typeErrors.length === 0) {
					console.log("  TypeScript 类型校验：通过（内存检查，零临时文件）");
				} else {
					console.log(`  TypeScript 类型校验：失败（${typeErrors.length} 项）`);
					for (const error of typeErrors) console.log(`    - ${error}`);
					addError(`配置覆盖未通过 TypeScript 类型校验：${typeErrors[0]}`);
				}
			} else {
				console.log("  TypeScript 类型校验：无有效覆盖，跳过");
			}
		}

		const footer = join(configDirectory, FOOTER_HTML_SOURCE);
		if (existsSync(footer)) {
			if (statSync(footer).isFile()) {
				configState.footerPath = footer;
				configState.files.push(`${CONFIG_DIRECTORY}/${FOOTER_HTML_SOURCE}`);
				console.log(
					`  自定义页脚：${CONFIG_DIRECTORY}/${FOOTER_HTML_SOURCE} (${formatBytes(statSync(footer).size)})`,
				);
			} else {
				addError(`${CONFIG_DIRECTORY}/${FOOTER_HTML_SOURCE} 不是文件`);
			}
		}
	}
	console.log("");
}

console.log("【5. 代码仓物化状态、锁文件与新旧一致性】");
const lockPath = join(ROOT, LOCK_FILE);
const userConfigPath = join(ROOT, GENERATED_CONFIG_FILE);
const lockState = readLock(lockPath);
const generatedConfig = inspectGeneratedConfig(userConfigPath);

if (lockState.state === "missing") {
	console.log(`  内容溯源锁 (${LOCK_FILE})：不存在`);
} else if (lockState.state === "invalid") {
	console.log(`  内容溯源锁 (${LOCK_FILE})：无效（${lockState.error}）`);
	addError(`${LOCK_FILE} 无法作为可信溯源：${lockState.error}`);
} else {
	const lock = lockState.lock;
	console.log(`  内容溯源锁 (${LOCK_FILE})：有效`);
	console.log(`    - 上次同步时间：${lock.syncedAt}`);
	if (lock.source.type === "git") {
		console.log(
			`    - 锁定来源：git ${redactUrl(lock.source.url || "未知")} @ ${lock.source.ref || "未知"}`,
		);
	} else if (lock.source.type === "path") {
		console.log(`    - 锁定来源：path ${lock.source.path || "未知"}`);
	}
	console.log(
		`    - 锁定 Commit：${lock.source.commit || "未记录（旧锁或非 Git 目录）"}`,
	);
	console.log(`    - 锁定配置：${lock.config.length} 个`);
}

console.log(`  配置生成物 (${GENERATED_CONFIG_FILE})：`);
if (generatedConfig.state === "missing") {
	console.log("    缺失（项目配置模块将无法正常导入）");
	addError(`${GENERATED_CONFIG_FILE} 缺失`);
} else if (generatedConfig.state === "unreadable") {
	console.log(`    无法读取（${generatedConfig.error}）`);
	addError(`${GENERATED_CONFIG_FILE} 无法读取`);
} else if (generatedConfig.state === "empty") {
	console.log("    空覆盖层（语义检查通过，不受注释或换行格式影响）");
} else if (generatedConfig.state === "materialized") {
	console.log("    已生成外部配置覆盖");
} else {
	console.log("    已被手工修改或格式无法识别");
	addWarning(`${GENERATED_CONFIG_FILE} 不是可识别的生成物`);
}

if (resolved.mode === "external") {
	if (lockState.state === "missing") {
		addError(
			"external 模式尚无内容锁，当前代码仓不能证明已物化，请运行 content sync",
		);
	}
	if (configState.valid && generatedConfig.source !== null) {
		const expectedEmpty = isSemanticallyEmptyConfig(configState.expectedSource);
		const configMatches = expectedEmpty
			? isSemanticallyEmptyConfig(generatedConfig.source)
			: normalizeText(generatedConfig.source) ===
				normalizeText(configState.expectedSource);
		if (!configMatches) {
			addError("配置生成物与当前内容仓 YAML 不一致，请重新运行 content sync");
		} else {
			console.log("  配置一致性：与当前内容仓 YAML 一致");
		}
	}

	if (lockState.state === "valid") {
		const lock = lockState.lock;
		if (lock.source.type !== resolved.source.type) {
			addError("锁文件来源类型与当前内容源配置不一致");
		} else if (resolved.source.type === "path") {
			if (
				!lock.source.path ||
				normalizePathForCompare(lock.source.path) !==
					normalizePathForCompare(sourceRoot || resolved.source.path)
			) {
				addError("锁文件中的 path 内容源与当前配置不一致");
			}
		} else {
			if (
				canonicalGitUrl(lock.source.url || "") !==
				canonicalGitUrl(resolved.source.url)
			) {
				addError("锁文件中的 Git URL 与当前配置不一致");
			}
			if (lock.source.ref !== resolved.source.ref) {
				addError("锁文件中的 Git ref 与当前配置不一致");
			}
		}

		if (currentCommit && lock.source.commit) {
			if (currentCommit !== lock.source.commit) {
				addError("当前内容仓 commit 与锁文件不一致，物化结果已过期");
			} else {
				console.log(`  Commit 一致性：一致 (${currentCommit.slice(0, 8)})`);
			}
		} else if (currentCommit && !lock.source.commit) {
			addWarning(
				"锁文件未记录 commit，无法用版本号证明物化结果新旧；重新 sync 可升级锁文件",
			);
		}

		if (configState.valid && !arraysEqual(lock.config, configState.files)) {
			addError("锁文件记录的配置文件清单与当前内容仓不一致");
		}

		if (sourceRoot) {
			for (const [sourceDir, targetDir] of Object.entries(resolved.mounts)) {
				const snapshot = mountSnapshots.get(sourceDir);
				if (!snapshot) continue;
				const lockedStats = lock.mounts[targetDir];
				if (!lockedStats || lockedStats.files !== snapshot.count) {
					addError(`${sourceDir}/ 的当前文件数与锁文件不一致`);
				}
				const differences = compareMount(
					snapshot,
					join(ROOT, targetDir),
					resolved,
					lock.prune ?? resolved.prune,
				);
				if (differences.length > 0) {
					addError(
						`${sourceDir}/ 与 ${targetDir}/ 有 ${differences.length} 个文件未物化或已变化` +
							`（${differences.slice(0, 3).join("、")}${differences.length > 3 ? " 等" : ""}）`,
					);
				}
			}
		}

		if (configState.footerPath) {
			const footerTarget = join(ROOT, "src/config/FooterConfig.html");
			if (
				!existsSync(footerTarget) ||
				!readFileSync(configState.footerPath).equals(readFileSync(footerTarget))
			) {
				addError("自定义 footer.html 与代码仓物化结果不一致");
			}
		}
	}
} else if (resolved.mode === "local") {
	if (lockState.state !== "missing") {
		addError(
			"local 模式仍残留内容锁，代码仓不是纯净主题态；请运行 content clean --yes",
		);
	}
	if (generatedConfig.state !== "empty") {
		addError("local 模式的配置生成物不是空覆盖层");
	}
}

console.log("");
console.log("【诊断结论】");
const errors = findings.filter((finding) => finding.severity === "error");
const warnings = findings.filter((finding) => finding.severity === "warning");
if (errors.length === 0 && warnings.length === 0) {
	console.log("  健康：未发现错误或告警");
} else {
	console.log(
		`  ${errors.length > 0 ? "异常" : "可用但有告警"}：${errors.length} 个错误，${warnings.length} 个告警`,
	);
	for (const finding of findings) {
		console.log(
			`    - [${finding.severity === "error" ? "错误" : "告警"}] ${finding.message}`,
		);
	}
}

console.log("\n常用操作：");
console.log("  - 刷新物化：pnpm content sync");
console.log("  - 完整配置类型校验：pnpm content validate");
console.log("  - 含远端实时探测：pnpm content status --remote");
console.log("  - 恢复纯净主题态：pnpm content clean --yes");
console.log(
	"================================================================================",
);

if (errors.length > 0) process.exitCode = 1;

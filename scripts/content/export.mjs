/**
 * 内容反向导出：把代码仓侧的改动安全地回写内容仓。
 *
 * `content:sync` 是单向的（内容仓 -> 代码仓），且带裁剪：在 `src/content/posts/` 里新写的文章
 * 会在下一次 `pnpm dev`（首步就是 sync）被当作「内容仓已删除的文件」直接删掉。
 * 本脚本补齐反方向的通道，让那些改动先回到内容仓，再由 sync 正常物化回来。
 *
 * 两条不变式定义了它的正确性：
 *
 * ```text
 * 文件：export ──▶ sync ──▶ 两侧内容哈希全等，且再跑一次 export 报告「无改动」
 * 配置：export ──▶ sync ──▶ 生效配置与导出前逐字段相等（deepMerge ∘ diffConfig ≡ id）
 * ```
 *
 * 与 `content:eject` 的职责边界（两者都写内容仓，但语义完全不同）：
 *
 * | | `content:eject` | `content:export` |
 * | --- | --- | --- |
 * | 执行次数 | 一次性 | 可反复 |
 * | 目标目录 | 必须为空（或 `--force`） | 必须是已存在的内容仓 |
 * | 改代码仓 `.gitignore` / git 索引 / `shirone.content.json` | 会 | **绝不** |
 * | 配置产出 | 只倒「站点身份」起步文件 | 按 diff 增量回写全部可导出领域 |
 * | 生成 README / workflow 起步文件 | 会 | 不会 |
 *
 * 因此本脚本**不复用** `eject.mjs` 的 `EXPORT_RULES`：那是一张写死子目录的一次性白名单，
 * 而导出必须按当前生效的 `mounts` 反转，否则清单自定义挂载点时会导出到错误的位置。
 *
 * 安全机制（导出是向**另一个 git 仓库**写入，比 clean 更危险）：
 * 1. **默认只预演**，与 `content:eject`、`content:clean` 一致；
 * 2. **拒绝 `local` 模式**（没有内容仓可写）、**拒绝 CI**（这是本地开发命令）；
 * 3. **拒绝 `type: "git"` 的内容源**：`.content-src/` 是 `--depth 1` 的游离 HEAD 工作副本，
 *    往里写并提交会直接丢失。需要显式 `--out` 指向一份真正的本地检出；
 * 4. **要求内容仓工作区干净**，否则拒绝并列出脏文件（`--force` 跳过）；
 * 5. **默认绝不删除**内容仓文件，`--prune` 才允许，且必须先备份；
 * 6. **快照备份**：所有将被覆盖或删除的文件先复制到内容仓 `.export-backup/<timestamp>/`；
 * 7. **失败即熔断**，并区分「未产生任何写入」与「已写入部分文件（备份在 X）」；
 * 8. **写后校验**：用现成的 `readConfigOverrides` + `generateModule` + `typeCheckModule`
 *    确认写出的 YAML 能通过 `tsc`，绝不把过不了 CI 的配置留在内容仓。
 *
 * 用法：
 *   node scripts/content/export.mjs                    # 预演（默认）
 *   node scripts/content/export.mjs --yes              # 实际执行
 *   node scripts/content/export.mjs --yes --config     # 只导出配置
 *   node scripts/content/export.mjs --yes --posts      # 只导出内容文件
 *   node scripts/content/export.mjs --yes --prune      # 允许删除内容仓的多余文件
 *   node scripts/content/export.mjs --yes --out ../my-content
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { parseDocument } from "yaml";
import {
	deepEqual,
	diffConfig,
	flattenOverride,
	OMIT,
} from "./config-diff.mjs";
import {
	CONFIG_DIRECTORY,
	CONFIG_DOMAINS,
	FOOTER_HTML_SOURCE,
	FOOTER_HTML_TARGET,
	GENERATED_CONFIG_FILE,
} from "./config-domains.mjs";
import {
	EXCLUDED_DOMAINS,
	EXPORTABLE_DOMAINS,
	introspectConfig,
} from "./config-introspect.mjs";
import {
	generateModule,
	readConfigOverrides,
	typeCheckModule,
} from "./config-overlay.mjs";
import {
	LOCK_FILE,
	matchesAny,
	PROTECTED_PATHS,
	resolveContentSource,
	toPosix,
	topSegment,
	WORKING_COPY_DIR,
} from "./resolve-source.mjs";

const ROOT = process.cwd();

/** 内容仓中存放导出快照备份的目录（本脚本会确保它进内容仓的 `.gitignore`）。 */
const BACKUP_DIR = ".export-backup";

/** 遍历两侧目录时始终跳过的目录名。 */
const SKIPPED_DIRECTORIES = new Set([
	".git",
	"node_modules",
	WORKING_COPY_DIR,
	BACKUP_DIR,
]);

/**
 * 永不导出的路径，与 `clean.mjs` 的 `CLEAN_PROTECTED_PATHS` 同一套语义。
 *
 * `PROTECTED_PATHS` 是构建期生成物：内容仓若持有同名文件，`sync.mjs` 会**直接报错**，
 * 所以导出它们等于亲手把内容仓变成一个同步不了的仓库。
 * 番剧快照来自外部 API，`.gitkeep` 是代码仓用来占位空目录的自有文件，一并豁免。
 */
const EXPORT_PROTECTED_PATHS = Object.freeze([
	...PROTECTED_PATHS,
	"src/data/anime-snapshots/**",
	"**/.gitkeep",
]);

/**
 * 按扩展名判定的文本文件。
 *
 * 文本要抹平换行之后再比对：Windows `core.autocrlf=true` 的检出会把被跟踪的 Markdown
 * 变成 CRLF，而内容仓里是 LF。按原始字节比会得出「每个文件都变了」，
 * 于是导出把整仓文本重写一遍——内容仓那边看到的是几十个纯换行差异的假改动。
 */
const TEXT_EXTENSIONS = new Set([
	".css",
	".htm",
	".html",
	".js",
	".json",
	".markdown",
	".md",
	".mdx",
	".mjs",
	".cjs",
	".svg",
	".toml",
	".ts",
	".tsx",
	".txt",
	".xml",
	".yaml",
	".yml",
]);

/**
 * 疑似凭据的键名。命中只告警不阻断——内容仓禁止存放密钥（见 `docs/content-separation.md`），
 * 但判断「这个字符串是不是密钥」终究要人来做。
 *
 * 锚在段末，因此 `sessdataEnv`（环境变量**名**，本来就该进配置）不会命中，
 * 而 `commentConfig.twikoo.envId` 这类公开标识符压根不含这些词。
 */
const CREDENTIAL_KEY_PATTERN =
	/(?:^|[._-])(?:tokens?|secrets?|passwords?|passwd|api[-_]?keys?|access[-_]?keys?|private[-_]?keys?|credentials?|sessdata|client[-_]?secret)$/i;

/** 已知服务商的令牌前缀。这类模式精度高，误报可以忽略。 */
const CREDENTIAL_VALUE_PATTERN =
	/(?:gh[pousr]_[A-Za-z0-9]{16,}|github_pat_[A-Za-z0-9_]{20,}|xox[abprs]-[A-Za-z0-9-]{10,}|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{30,}|glpat-[A-Za-z0-9_-]{16,})/;

/** CI 环境变量的真值集合。 */
const TRUTHY = new Set(["1", "true", "yes", "on"]);

// ─────────────────────────────────────────────────────────────────────────────
// 参数
// ─────────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const onlyConfig = args.includes("--config");
const onlyPosts = args.includes("--posts");
const options = {
	// 与 content:eject / content:clean 一致：默认只预演，`--dry-run` 优先于 `--yes`。
	apply: args.includes("--yes") && !args.includes("--dry-run"),
	// 都不给等于两者都导出；两个都给也是两者都导出。
	scopeConfig: onlyConfig || !onlyPosts,
	scopeFiles: onlyPosts || !onlyConfig,
	prune: args.includes("--prune"),
	pruneConfig: args.includes("--prune-config"),
	force: args.includes("--force"),
	out: null,
	help: args.includes("--help") || args.includes("-h"),
};

const outIndex = args.indexOf("--out");
if (outIndex !== -1) {
	if (!args[outIndex + 1] || args[outIndex + 1].startsWith("-")) {
		console.error("[content:export] --out 需要一个目录参数。");
		process.exit(1);
	}
	options.out = args[outIndex + 1];
}

/** 破坏性阶段是否已经开始——决定失败时该说「内容仓原样」还是「已写入部分文件」。 */
let mutated = false;
/** 快照备份目录（绝对路径），失败提示里要指出来。 */
let backupDirectory = null;

function log(message) {
	console.log(`[content:export] ${message}`);
}

function warn(message) {
	console.warn(`[content:export] 注意：${message}`);
}

function fail(step, error, details = "") {
	console.error(`\n[content:export] 步骤失败并已中止：${step}`);
	if (details) console.error(`[content:export] 上下文：${details}`);
	if (error instanceof Error) {
		console.error(`[content:export] 错误信息：${error.message}`);
		if (error.stack) console.error(`[content:export] 调用栈：\n${error.stack}`);
	} else if (error !== undefined && error !== null) {
		console.error(`[content:export] 错误详情：${String(error)}`);
	}
	console.error(
		mutated
			? `[content:export] 已写入部分文件。${
					backupDirectory
						? `被覆盖或删除的原始文件在 ${backupDirectory}，可按相同相对路径拷回内容仓还原。`
						: "本次未创建快照备份（计划中没有需要覆盖或删除的文件），请在内容仓用 git 复查改动。"
				}\n`
			: "[content:export] 未向内容仓写入任何内容，两侧仓库均保持原样。\n",
	);
	process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// 通用工具
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 在指定仓库里跑 git。
 *
 * `core.quotepath=false` 不能省：否则中文路径会被输出成 `"content/posts/\346\246\202..."`，
 * 按它去 `existsSync` 必然 false，脏文件检查与备份阶段都会静默漏掉这些文件。
 */
function runGit(cwd, gitArgs, { allowFailure = false } = {}) {
	try {
		return execFileSync("git", ["-c", "core.quotepath=false", ...gitArgs], {
			cwd,
			encoding: "utf8",
			maxBuffer: 64 * 1024 * 1024,
			stdio: ["ignore", "pipe", "pipe"],
			env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
		});
	} catch (error) {
		if (allowFailure) return null;
		const detail = `${error.stderr ?? ""}${error.stdout ?? ""}`.trim();
		throw new Error(
			`git ${gitArgs.join(" ")} 执行失败：${detail || error.message}`,
		);
	}
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

function isTextPath(path) {
	const index = path.lastIndexOf(".");
	return index !== -1 && TEXT_EXTENSIONS.has(path.slice(index).toLowerCase());
}

/** 抹平换行，让「只差 CRLF」不被当成内容改动。 */
function normalizeNewlines(text) {
	return text.split("\r\n").join("\n");
}

/** 文件内容摘要：文本按抹平换行后的字符计算，二进制按原始字节。 */
function contentDigest(absolutePath) {
	const buffer = readFileSync(absolutePath);
	const payload = isTextPath(absolutePath)
		? normalizeNewlines(buffer.toString("utf8"))
		: buffer;
	return createHash("sha256").update(payload).digest("hex");
}

/**
 * 写出一个导出文件。
 *
 * 文本一律归一化成 LF：内容仓是这些文件的规范存储，混进 CRLF 会让 git 把整个文件报成改动，
 * 淹没真正的内容差异。二进制原样拷贝。
 */
function writeExported(sourceAbsolute, targetAbsolute) {
	mkdirSync(dirname(targetAbsolute), { recursive: true });
	if (isTextPath(sourceAbsolute)) {
		writeFileSync(
			targetAbsolute,
			normalizeNewlines(readFileSync(sourceAbsolute, "utf8")),
			"utf8",
		);
	} else {
		copyFileSync(sourceAbsolute, targetAbsolute);
	}
}

function fileSize(absolute) {
	try {
		return statSync(absolute).size;
	} catch {
		return 0;
	}
}

function formatBytes(bytes) {
	if (bytes < 1024) return `${bytes} B`;
	const units = ["KB", "MB", "GB"];
	let value = bytes / 1024;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit += 1;
	}
	return `${value.toFixed(1)} ${units[unit]}`;
}

function preview(items, limit = 10, render = (item) => item) {
	for (const item of items.slice(0, limit)) console.log(`    ${render(item)}`);
	if (items.length > limit) {
		console.log(`    …… 以及另外 ${items.length - limit} 项`);
	}
}

/** 沿路径取值，区分「路径不存在」与「值就是 undefined」。 */
function getAtPath(root, path) {
	let cursor = root;
	for (const segment of path) {
		if (cursor === null || typeof cursor !== "object") {
			return { present: false, value: undefined };
		}
		if (!Object.hasOwn(cursor, segment))
			return { present: false, value: undefined };
		cursor = cursor[segment];
	}
	return { present: true, value: cursor };
}

function formatValue(value) {
	const text = JSON.stringify(value);
	if (text === undefined) return "undefined";
	return text.length > 72 ? `${text.slice(0, 69)}…` : text;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. 硬闸门：运行环境与内容源
// ─────────────────────────────────────────────────────────────────────────────

if (options.help) {
	console.log(
		[
			"用法：node scripts/content/export.mjs [--yes] [--config|--posts] [--prune] [--force] [--out <dir>]",
			"",
			"  （无参数）/--dry-run  预演：只打印导出计划，不修改任何文件",
			"  --yes                 实际执行导出（--dry-run 优先级更高）",
			"  --config              只导出配置（内容仓 config/*.yaml 与 footer.html）",
			"  --posts               只导出内容文件（按挂载表反转）",
			"  --prune               允许删除内容仓中代码仓已不存在的文件（默认关闭）",
			"  --prune-config        允许删除内容仓 YAML 中「已等于主题默认值」的冗余键",
			"  --force               跳过「内容仓工作区干净」与「物化状态一致」检查",
			"  --out <dir>           覆盖导出目标（默认取当前生效的内容源目录）",
			"",
			"导出范围按当前生效的 mounts 反转。构建期生成物、keep 声明的代码仓自有文件、",
			"番剧快照与 .gitkeep 永不导出；nav-bar 因 resolveNavBarLinks() 不可逆而排除。",
			"",
			"本脚本绝不修改代码仓的 .gitignore、git 索引或 shirone.content.json——那是 content:eject 的职责。",
		].join("\n"),
	);
	process.exit(0);
}

if (
	TRUTHY.has(
		String(process.env.CI ?? "")
			.trim()
			.toLowerCase(),
	)
) {
	fail(
		"检查运行环境",
		new Error("检测到 CI=true"),
		"content:export 是本地开发命令：它向内容仓写入并期待你人工复核 diff 后提交。" +
			" CI 里应当只跑 content:sync。",
	);
}

let resolved;
try {
	resolved = resolveContentSource(ROOT);
} catch (error) {
	fail("解析内容源", error, "清单文件：shirone.content.json");
}

if (resolved.mode === "local") {
	fail(
		"解析内容源",
		new Error(`当前是 local 模式：${resolved.reason}`),
		"local 模式下内容就存在代码仓里，没有「内容仓」可以回写。" +
			" 若要迁出到独立内容仓，用 pnpm content:eject；" +
			" 若已有内容仓，请设置 CONTENT_DIR 或在 shirone.content.json 里声明 source。",
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. 解析导出目标
// ─────────────────────────────────────────────────────────────────────────────

if (resolved.source.type === "git" && options.out === null) {
	fail(
		"解析导出目标",
		new Error(`内容源是 type: "git"，没有可写的本地检出`),
		`${WORKING_COPY_DIR}/ 是 --depth 1 + checkout --detach FETCH_HEAD 的浅工作副本，` +
			' 往里写入并提交会落在游离 HEAD 上直接丢失（与 content:watch 只支持 type: "path" 同源）。' +
			" 请先在别处 clone 一份完整的内容仓，再用 --out <该目录> 指定导出目标。",
	);
}

const targetRoot =
	options.out === null
		? resolve(ROOT, resolved.source.path)
		: resolve(ROOT, options.out);

if (targetRoot === resolve(ROOT, WORKING_COPY_DIR)) {
	fail(
		"解析导出目标",
		new Error(`导出目标不能是 ${WORKING_COPY_DIR}/`),
		"它是 content:sync 管理的浅工作副本，每次同步都会被 git clean -ffdx 抹掉。",
	);
}
if (targetRoot === ROOT) {
	fail(
		"解析导出目标",
		new Error("导出目标不能是代码仓自身"),
		"导出会把挂载目标下的文件按内容仓布局写到目标目录，指向代码仓会造成自我覆盖。",
	);
}
if (!existsSync(targetRoot) || !statSync(targetRoot).isDirectory()) {
	fail(
		"解析导出目标",
		new Error(`导出目标不存在或不是目录：${targetRoot}`),
		"content:export 只写入**已存在**的内容仓，不负责创建它——" +
			" 首次迁出请用 pnpm content:eject。",
	);
}

// content.lock.json 记录了上次 sync 用的内容源。对不上说明可能指错了仓库。
const lockPath = join(ROOT, LOCK_FILE);
if (existsSync(lockPath)) {
	try {
		const lock = JSON.parse(readFileSync(lockPath, "utf8"));
		if (lock?.source?.type === "path") {
			const locked = resolve(ROOT, lock.source.path);
			if (locked !== targetRoot) {
				warn(
					`导出目标与 ${LOCK_FILE} 记录的内容源不一致：` +
						`上次同步自 ${toPosix(locked)}，本次将写入 ${toPosix(targetRoot)}。` +
						" 请确认没有指错仓库。",
				);
			}
		} else if (lock?.source?.type === "git") {
			warn(
				`${LOCK_FILE} 记录上次同步来自远端仓库（${lock.source.url ?? "?"} @ ${
					lock.source.ref ?? "?"
				}），而本次导出写入本地目录 ${toPosix(targetRoot)}。` +
					" 请确认这个目录就是那个仓库的检出。",
			);
		}
	} catch (error) {
		warn(`${LOCK_FILE} 解析失败，跳过内容源交叉校验：${error.message}`);
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. 内容仓 git 状态
// ─────────────────────────────────────────────────────────────────────────────

const contentRepo = { isGit: false, head: null, dirty: [] };
if (
	runGit(targetRoot, ["rev-parse", "--is-inside-work-tree"], {
		allowFailure: true,
	})
) {
	contentRepo.isGit = true;
	contentRepo.head = (
		runGit(targetRoot, ["rev-parse", "HEAD"], { allowFailure: true }) ?? ""
	).trim();
	const status =
		runGit(targetRoot, ["status", "--porcelain", "-z", "-uall"], {
			allowFailure: true,
		}) ?? "";
	// porcelain -z 的记录形如 `XY <path>\0`；重命名会多出一条原路径记录，一并收进来即可。
	contentRepo.dirty = status
		.split("\0")
		.filter(Boolean)
		.map((record) => (record.length > 3 ? record.slice(3) : record))
		.map(toPosix);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. 内容文件计划（挂载表反转）
// ─────────────────────────────────────────────────────────────────────────────

/** 判定某个代码仓路径是否豁免导出，命中返回原因。 */
function exemptionReason(repoRelative) {
	if (matchesAny(repoRelative, EXPORT_PROTECTED_PATHS)) {
		return "构建期生成物或目录占位文件";
	}
	if (resolved.keep.length > 0 && matchesAny(repoRelative, resolved.keep)) {
		return "shirone.content.json 的 keep 声明为代码仓自有";
	}
	return null;
}

/**
 * 反转 `mounts`（内容仓目录 -> 代码仓目录），逐文件按内容哈希比对。
 *
 * 裁剪方向的顶层段规则与 `sync.mjs` 对称：**只有内容仓确实拥有的顶层段才参与**。
 * 否则 `public/favicon/`、`public/pagefind/`、`src/assets/fonts/` 这些主题自有目录
 * 与构建产物会被一股脑倒进内容仓。未参与的顶层段会在计划里明确报出来，不做静默丢弃。
 */
function buildFilePlan() {
	const plan = {
		added: [],
		updated: [],
		skipped: [],
		exempt: [],
		prunable: [],
		unowned: [],
		missingMounts: [],
	};
	if (!options.scopeFiles) return plan;

	for (const [sourceDir, targetDir] of Object.entries(resolved.mounts)) {
		const contentAbsolute = join(targetRoot, sourceDir);
		const repoAbsolute = join(ROOT, targetDir);
		if (!existsSync(contentAbsolute)) {
			plan.missingMounts.push({ sourceDir, targetDir });
			continue;
		}

		const contentFiles = collectFiles(contentAbsolute);
		const contentSet = new Set(contentFiles);
		const owned = new Set(contentFiles.map(topSegment));
		const repoFiles = existsSync(repoAbsolute)
			? collectFiles(repoAbsolute)
			: [];
		const repoSet = new Set(repoFiles);
		const unownedCounts = new Map();

		for (const relativePath of repoFiles) {
			const repoRelative = `${targetDir}/${relativePath}`;
			const entry = {
				repo: repoRelative,
				content: `${sourceDir}/${relativePath}`,
				repoAbsolute: join(repoAbsolute, relativePath),
				contentAbsolute: join(contentAbsolute, relativePath),
			};

			const reason = exemptionReason(repoRelative);
			if (reason) {
				plan.exempt.push({ ...entry, reason });
				continue;
			}
			if (!owned.has(topSegment(relativePath))) {
				const segment = `${targetDir}/${topSegment(relativePath) || "(根级文件)"}`;
				unownedCounts.set(segment, (unownedCounts.get(segment) ?? 0) + 1);
				continue;
			}
			if (!contentSet.has(relativePath)) {
				plan.added.push(entry);
				continue;
			}
			const same =
				contentDigest(entry.repoAbsolute) ===
				contentDigest(entry.contentAbsolute);
			(same ? plan.skipped : plan.updated).push(entry);
		}

		for (const [segment, count] of unownedCounts) {
			plan.unowned.push({ segment, count });
		}

		// 反向裁剪候选：内容仓有、代码仓没有。默认只报告不删除（见 --prune）。
		for (const relativePath of contentFiles) {
			if (repoSet.has(relativePath)) continue;
			const repoRelative = `${targetDir}/${relativePath}`;
			if (exemptionReason(repoRelative)) continue;
			plan.prunable.push({
				repo: repoRelative,
				content: `${sourceDir}/${relativePath}`,
				contentAbsolute: join(contentAbsolute, relativePath),
			});
		}
	}
	return plan;
}

let filePlan;
try {
	filePlan = buildFilePlan();
} catch (error) {
	fail("比对内容文件", error, `导出目标：${targetRoot}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. 配置计划（内省 + 反向差分 + YAML 写回）
// ─────────────────────────────────────────────────────────────────────────────

/** 扫描将要写入的值，报出疑似凭据。只告警不阻断。 */
function scanCredentials(file, path, value, sink) {
	const walk = (node, trail) => {
		if (typeof node === "string") {
			const key = trail.at(-1);
			const suspiciousKey =
				typeof key === "string" &&
				CREDENTIAL_KEY_PATTERN.test(key) &&
				node !== "";
			if (suspiciousKey || CREDENTIAL_VALUE_PATTERN.test(node)) {
				sink.push({ file, path: trail.join(".") });
			}
			return;
		}
		if (Array.isArray(node)) {
			for (const [index, item] of node.entries()) {
				walk(item, [...trail, index]);
			}
			return;
		}
		if (node !== null && typeof node === "object") {
			for (const [key, item] of Object.entries(node))
				walk(item, [...trail, key]);
		}
	};
	walk(value, path);
}

/** 找出该领域已存在的 YAML 文件；都不存在时给出将要新建的 `.yaml` 路径。 */
function resolveYamlTarget(configDirectory, base) {
	for (const extension of [".yaml", ".yml"]) {
		const absolute = join(configDirectory, `${base}${extension}`);
		if (existsSync(absolute)) {
			return {
				absolute,
				relative: `${CONFIG_DIRECTORY}/${base}${extension}`,
				exists: true,
			};
		}
	}
	return {
		absolute: join(configDirectory, `${base}.yaml`),
		relative: `${CONFIG_DIRECTORY}/${base}.yaml`,
		exists: false,
	};
}

/** 新建 YAML 文件时写在最前面的说明，与 eject 起步文件的口径一致。 */
function fileHeader(domain) {
	return [
		`# ${domain.file}.yaml —— 覆盖主题的 src/config/${domain.key}Config.ts`,
		"# 由 pnpm content:export 写出：只含与主题默认值不同的键，",
		"# 未列出的键继续跟随主题默认值（主题升级后新默认值会自动生效）。",
		"",
		"",
	].join("\n");
}

function buildConfigPlan() {
	const plan = {
		domains: [],
		footer: null,
		excluded: [],
		unrepresentable: [],
		credentials: [],
		stale: [],
		introspectErrors: [],
		unexplained: [],
	};
	if (!options.scopeConfig) return plan;

	const configDirectory = join(targetRoot, CONFIG_DIRECTORY);
	const { values, overrides, errors } = introspectConfig(ROOT);
	plan.introspectErrors = errors;

	// 内容仓 YAML 现状：既用于「只增改不删键」的比对，也用于交叉校验物化状态。
	const yamlEntries = readConfigOverrides(configDirectory);
	const yamlByKey = new Map(
		yamlEntries.map((entry) => [entry.domain.key, entry.value]),
	);

	// 物化状态是否落后于内容仓：落后时 effective 是过期快照，
	// 导出会把旧值写回内容仓，静默盖掉用户在那边的新改动。
	if (overrides !== null) {
		for (const domain of CONFIG_DOMAINS) {
			const yaml = yamlByKey.get(domain.key);
			const active = overrides[domain.key];
			if (!deepEqual(yaml ?? null, active ?? null)) {
				plan.stale.push(domain);
			}
		}
	}

	for (const domain of EXPORTABLE_DOMAINS) {
		const value = values[domain.key];
		if (value === undefined) continue;

		const unrepresentable = [];
		const override = diffConfig(value.defaults, value.effective, {
			unrepresentable,
			path: "",
		});
		for (const path of unrepresentable) {
			plan.unrepresentable.push({ domain, path });
		}

		const target = resolveYamlTarget(configDirectory, domain.file);
		const raw = target.exists ? readFileSync(target.absolute, "utf8") : "";
		const document = parseDocument(raw);
		const current = document.toJS() ?? {};
		const leaves = override === OMIT ? [] : flattenOverride(override);

		const changes = [];
		for (const leaf of leaves) {
			const existing = getAtPath(current, leaf.path);
			if (existing.present && deepEqual(existing.value, leaf.value)) continue;
			changes.push({
				path: leaf.path,
				from: existing.present ? existing.value : undefined,
				to: leaf.value,
				existed: existing.present,
			});
			scanCredentials(target.relative, leaf.path, leaf.value, plan.credentials);
		}

		// 「只增改不删键」：内容仓已有、但现在恰好等于主题默认值的键要保留——
		// 用户写下它可能就是为了钉住这个值不跟随主题升级，静默删掉会改变意图。
		const removals = [];
		const overridePaths = new Set(
			leaves.map((leaf) => JSON.stringify(leaf.path)),
		);
		for (const leaf of flattenOverride(current)) {
			if (leaf.path.length === 0) continue;
			if (overridePaths.has(JSON.stringify(leaf.path))) continue;
			const fallback = getAtPath(value.defaults, leaf.path);
			if (fallback.present && deepEqual(fallback.value, leaf.value)) {
				removals.push({ path: leaf.path, value: leaf.value });
				continue;
			}
			// 既不在覆盖集里、也不等于默认值：多半是物化状态过期，或主题已删掉这个键。
			plan.unexplained.push({
				file: target.relative,
				path: leaf.path.join("."),
			});
		}

		plan.domains.push({
			domain,
			target,
			document,
			changes,
			removals,
			hasOverride: override !== OMIT,
		});
	}

	// footer.html 是唯一的非 YAML 入口，原样（按文本归一化）比对。
	const footerRepo = join(ROOT, FOOTER_HTML_TARGET);
	if (existsSync(footerRepo)) {
		const footerContent = join(configDirectory, FOOTER_HTML_SOURCE);
		const exists = existsSync(footerContent);
		const same =
			exists && contentDigest(footerRepo) === contentDigest(footerContent);
		plan.footer = {
			repo: FOOTER_HTML_TARGET,
			content: `${CONFIG_DIRECTORY}/${FOOTER_HTML_SOURCE}`,
			repoAbsolute: footerRepo,
			contentAbsolute: footerContent,
			state: same ? "skipped" : exists ? "updated" : "added",
		};
	}

	plan.excluded = EXCLUDED_DOMAINS.map((item) => ({
		domain: item.domain,
		reason: item.reason,
		file: `${CONFIG_DIRECTORY}/${item.domain.file}.yaml`,
	}));

	return plan;
}

let configPlan;
try {
	configPlan = buildConfigPlan();
} catch (error) {
	fail(
		"比对配置",
		error,
		"内省会起子进程 import src/config/*Config.ts，并读取内容仓 config/*.yaml。" +
			" 若是 YAML 解析或未知文件名报错，请先修好内容仓那边的配置。",
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. 计划输出（默认行为）
// ─────────────────────────────────────────────────────────────────────────────

const configWrites = configPlan.domains.filter(
	(item) =>
		item.changes.length > 0 ||
		(options.pruneConfig && item.removals.length > 0),
);
const footerWrite =
	configPlan.footer && configPlan.footer.state !== "skipped"
		? configPlan.footer
		: null;
const fileWrites = [...filePlan.added, ...filePlan.updated];
const prunes = options.prune ? filePlan.prunable : [];

/** 会被覆盖或删除的内容仓文件——正是需要先备份的那批。 */
const toBackup = [
	...filePlan.updated.map((item) => item.content),
	...prunes.map((item) => item.content),
	...configWrites
		.filter((item) => item.target.exists)
		.map((item) => item.target.relative),
	...(footerWrite && footerWrite.state === "updated"
		? [footerWrite.content]
		: []),
].filter((path) => existsSync(join(targetRoot, path)));
const backupBytes = toBackup.reduce(
	(sum, path) => sum + fileSize(join(targetRoot, path)),
	0,
);

const nothingToDo =
	fileWrites.length === 0 &&
	prunes.length === 0 &&
	configWrites.length === 0 &&
	footerWrite === null;

log(
	options.apply
		? `开始导出到内容仓 ${toPosix(targetRoot)}……`
		: `预演模式（未指定 --yes，不会修改任何文件）。目标内容仓：${toPosix(targetRoot)}`,
);
log(
	`范围：${[options.scopeFiles && "内容文件", options.scopeConfig && "配置"]
		.filter(Boolean)
		.join(" + ")}（内容源来自 ${resolved.source.origin}）`,
);

if (options.scopeFiles) {
	log(
		`内容文件：新增 ${filePlan.added.length}、更新 ${filePlan.updated.length}、` +
			`跳过（哈希相同）${filePlan.skipped.length}、豁免 ${filePlan.exempt.length}。`,
	);
	if (filePlan.added.length > 0) {
		console.log("  [新增]");
		preview(filePlan.added, 10, (item) => `${item.content}  ← ${item.repo}`);
	}
	if (filePlan.updated.length > 0) {
		console.log("  [更新]");
		preview(filePlan.updated, 10, (item) => `${item.content}  ← ${item.repo}`);
	}
	if (filePlan.exempt.length > 0) {
		console.log("  [豁免]");
		const reasons = new Map();
		for (const item of filePlan.exempt) {
			reasons.set(item.reason, (reasons.get(item.reason) ?? 0) + 1);
		}
		for (const [reason, count] of reasons) {
			console.log(`    ${count} 个文件 —— ${reason}`);
		}
	}
	if (filePlan.unowned.length > 0) {
		console.log("  [未纳入：内容仓不拥有该顶层段]");
		preview(
			filePlan.unowned,
			8,
			(item) => `${item.segment}/  （${item.count} 个文件）`,
		);
	}
	for (const mount of filePlan.missingMounts) {
		log(
			`内容仓没有 ${mount.sourceDir}/，本次不导出 ${mount.targetDir}/。` +
				" 需要纳入的话，先在内容仓建好该目录。",
		);
	}
	if (filePlan.prunable.length > 0) {
		console.log(
			options.prune
				? "  [删除：内容仓有、代码仓没有（--prune）]"
				: "  [仅报告：内容仓有、代码仓没有（默认不删除，需 --prune）]",
		);
		preview(filePlan.prunable, 10, (item) => item.content);
	}
}

if (options.scopeConfig) {
	const changedKeys = configWrites.reduce(
		(sum, item) => sum + item.changes.length,
		0,
	);
	log(
		`配置：${configWrites.length} 个 YAML 文件将被写入（共 ${changedKeys} 个键）、` +
			`${configPlan.domains.length - configWrites.length} 个领域无改动。`,
	);
	for (const item of configWrites) {
		console.log(
			`  [${item.target.exists ? "更新" : "新建"}] ${item.target.relative}`,
		);
		preview(
			item.changes,
			8,
			(change) =>
				`${change.path.join(".")}: ${
					change.existed ? `${formatValue(change.from)} → ` : ""
				}${formatValue(change.to)}`,
		);
		if (options.pruneConfig && item.removals.length > 0) {
			console.log("    [删除冗余键（--prune-config）]");
			preview(item.removals, 5, (removal) => removal.path.join("."));
		}
	}
	if (!options.pruneConfig) {
		const redundant = configPlan.domains.reduce(
			(sum, item) => sum + item.removals.length,
			0,
		);
		if (redundant > 0) {
			log(
				`内容仓另有 ${redundant} 个键的值已等于主题默认值。它们被保留（用户可能是刻意钉住该值），` +
					" 需要清理请加 --prune-config。",
			);
		}
	}
	if (configPlan.footer) {
		const label = {
			added: "新建",
			updated: "更新",
			skipped: "跳过（内容相同）",
		}[configPlan.footer.state];
		console.log(
			`  [${label}] ${configPlan.footer.content}  ← ${configPlan.footer.repo}`,
		);
	}
	for (const item of configPlan.excluded) {
		log(`${item.file} 未纳入导出：${item.reason}。请在内容仓手工维护该文件。`);
	}
	for (const item of configPlan.unrepresentable) {
		warn(
			`${item.domain.file}.yaml 的 ${item.path} 在主题默认值里存在、生效值里却没有。` +
				" 深合并只能新增和替换、不能删除键，因此这个差异无法用 YAML 表达，本次跳过。",
		);
	}
	for (const item of configPlan.introspectErrors) {
		warn(`领域 ${item.key} 内省失败，本次跳过它的配置导出：${item.message}`);
	}
	for (const item of configPlan.credentials) {
		warn(
			`${item.file} 的 ${item.path} 疑似凭据。内容仓禁止存放密钥，` +
				" 请改用环境变量 / GitHub Secrets，确认无误再执行导出。",
		);
	}
	if (configPlan.unexplained.length > 0) {
		warn(
			`内容仓有 ${configPlan.unexplained.length} 个键既不在本次覆盖集里、也不等于主题默认值` +
				`（如 ${configPlan.unexplained
					.slice(0, 3)
					.map((item) => `${item.file} 的 ${item.path}`)
					.join("、")}）。` +
				" 常见原因是物化状态过期或主题已移除该键；它们不会被本次导出改动。",
		);
	}
}

if (toBackup.length > 0) {
	log(
		`将先创建快照备份：${toBackup.length} 个文件，约 ${formatBytes(backupBytes)}，` +
			`落点 ${BACKUP_DIR}/（位于内容仓内）。`,
	);
}

// 脏工作区与物化过期都属于「会造成不可恢复覆盖」的前置条件，预演阶段就要报出来。
if (options.scopeConfig && configPlan.stale.length > 0) {
	warn(
		"代码仓已物化的配置覆盖层与内容仓 config/ 现状不一致，涉及领域：" +
			`${configPlan.stale.map((domain) => domain.file).join("、")}。` +
			" 这说明生效配置是过期快照，导出会把旧值写回内容仓。" +
			" 请先跑 pnpm content:sync 让两边对齐；确实想用代码仓覆盖内容仓时加 --force。",
	);
}
if (!contentRepo.isGit) {
	warn(
		`导出目标 ${toPosix(targetRoot)} 不是 git 仓库，无法在写入前用 git 兜底。` +
			" 强烈建议先 git init 并提交一次，否则本次覆盖只能靠快照备份还原。",
	);
} else if (contentRepo.dirty.length > 0) {
	warn(
		`内容仓有 ${contentRepo.dirty.length} 个未提交改动：` +
			`${contentRepo.dirty.slice(0, 8).join("、")}${
				contentRepo.dirty.length > 8 ? " 等" : ""
			}。`,
	);
}

if (!options.apply) {
	log(
		nothingToDo
			? "预演结束：内容仓已与代码仓一致，无需导出。"
			: "预演结束。确认无误后加 --yes 执行：pnpm content:export --yes",
	);
	process.exit(0);
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. 执行前闸门
// ─────────────────────────────────────────────────────────────────────────────

// 计划为空时不做脏工作区检查：没有任何覆盖，也就没有可丢失的东西。
// 这让「导出后不提交、直接再跑一次确认幂等」这个常规动作不必被迫加 --force。
if (
	!nothingToDo &&
	contentRepo.isGit &&
	contentRepo.dirty.length > 0 &&
	!options.force
) {
	fail(
		"检查内容仓工作区",
		new Error(`内容仓有 ${contentRepo.dirty.length} 个未提交改动`),
		"本次导出会覆盖内容仓中的文件，这些未提交改动将不可恢复地消失：\n" +
			contentRepo.dirty.map((path) => `    ${path}`).join("\n") +
			"\n  请先在内容仓提交或暂存，或加 --force 跳过检查（跳过前请确认上面这份清单）。",
	);
}

if (options.scopeConfig && configPlan.stale.length > 0 && !options.force) {
	fail(
		"校验物化状态",
		new Error(
			`代码仓的配置覆盖层落后于内容仓：${configPlan.stale
				.map((domain) => domain.file)
				.join("、")}`,
		),
		"生效配置读自 src/user/user-config.ts，它是上一次 content:sync 的产物。" +
			" 它与内容仓 config/ 不一致时，导出会把过期的值写回去，静默覆盖你在内容仓的新改动。" +
			" 请先跑 pnpm content:sync；若确实想用代码仓当前状态覆盖内容仓，加 --force。",
	);
}

if (nothingToDo) {
	log("内容仓已与代码仓一致，无需导出。");
	process.exit(0);
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. 快照备份
// ─────────────────────────────────────────────────────────────────────────────

/** 确保备份目录在内容仓的 `.gitignore` 内，缺失时补写。 */
function ensureBackupIgnored() {
	const gitignorePath = join(targetRoot, ".gitignore");
	const entry = `${BACKUP_DIR}/`;
	const current = existsSync(gitignorePath)
		? readFileSync(gitignorePath, "utf8")
		: "";
	const lines = current.split(/\r?\n/).map((line) => line.trim());
	if (lines.includes(entry) || lines.includes(`/${entry}`)) return false;
	const separator = current === "" || current.endsWith("\n") ? "" : "\n";
	writeFileSync(
		gitignorePath,
		`${current}${separator}\n# pnpm content:export 的快照备份\n${entry}\n`,
		"utf8",
	);
	return true;
}

if (toBackup.length > 0) {
	const now = new Date();
	const pad = (value) => String(value).padStart(2, "0");
	const stamp =
		`${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
		`-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
	const directory = join(targetRoot, BACKUP_DIR, stamp);

	try {
		if (ensureBackupIgnored()) {
			log(`已在内容仓 .gitignore 中补写 ${BACKUP_DIR}/。`);
		}
		mkdirSync(directory, { recursive: true });
		for (const path of toBackup) {
			const destination = join(directory, path);
			mkdirSync(dirname(destination), { recursive: true });
			copyFileSync(join(targetRoot, path), destination);
		}
		writeFileSync(
			join(directory, "manifest.json"),
			`${JSON.stringify(
				{
					timestamp: now.toISOString(),
					tool: "content:export",
					codeRepo: {
						root: toPosix(ROOT),
						head:
							(
								runGit(ROOT, ["rev-parse", "HEAD"], { allowFailure: true }) ??
								""
							).trim() || null,
					},
					contentRepo: { root: toPosix(targetRoot), head: contentRepo.head },
					scope: {
						files: options.scopeFiles,
						config: options.scopeConfig,
						prune: options.prune,
						pruneConfig: options.pruneConfig,
						mounts: resolved.mounts,
					},
					counts: {
						backedUp: toBackup.length,
						added: fileWrites.length - filePlan.updated.length,
						updated: filePlan.updated.length,
						pruned: prunes.length,
						configFiles: configWrites.length,
					},
					bytes: backupBytes,
					overwritten: toBackup,
					pruned: prunes.map((item) => item.content),
					restoreInstruction:
						"把本目录（除 manifest.json）下的文件按相同相对路径拷回内容仓即可还原：" +
						"PowerShell `Copy-Item -Recurse -Force .\\<本目录>\\* .` ；Bash `cp -a <本目录>/. .`。" +
						"内容仓是 git 仓库时，`git -C <内容仓> checkout .` 通常更直接。",
				},
				null,
				2,
			)}\n`,
			"utf8",
		);
		backupDirectory = toPosix(relative(targetRoot, directory));
		log(
			`已创建快照备份：${backupDirectory}（${toBackup.length} 个文件，${formatBytes(
				backupBytes,
			)}）`,
		);
	} catch (error) {
		fail(
			"创建快照备份",
			error,
			`备份目录：${directory}。为避免数据丢失，导出已在写入任何文件之前中止。`,
		);
	}
}

// 备份完成，之后的步骤开始产生实际改动。
mutated = true;

// ─────────────────────────────────────────────────────────────────────────────
// 9. 写入内容文件
// ─────────────────────────────────────────────────────────────────────────────

if (fileWrites.length > 0) {
	for (const item of fileWrites) {
		try {
			writeExported(item.repoAbsolute, item.contentAbsolute);
		} catch (error) {
			fail("写入内容文件", error, `${item.repo} -> ${item.content}`);
		}
	}
	log(
		`已导出 ${fileWrites.length} 个内容文件（新增 ${filePlan.added.length}，更新 ${filePlan.updated.length}）。`,
	);
}

if (prunes.length > 0) {
	for (const item of prunes) {
		try {
			rmSync(item.contentAbsolute, { force: true });
		} catch (error) {
			fail("删除内容仓多余文件", error, `路径：${item.content}`);
		}
	}
	log(`已删除 ${prunes.length} 个内容仓文件（--prune）。备份见上。`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. 写入配置
// ─────────────────────────────────────────────────────────────────────────────

/** 删掉某个键之后，自底向上清掉因此变空的父级映射。 */
function pruneEmptyParents(document, path) {
	for (let depth = path.length - 1; depth > 0; depth -= 1) {
		const parentPath = path.slice(0, depth);
		const parent = document.getIn(parentPath);
		const size = parent?.items?.length;
		if (size === undefined || size > 0) return;
		document.deleteIn(parentPath);
	}
}

if (configWrites.length > 0) {
	for (const item of configWrites) {
		try {
			for (const change of item.changes) {
				item.document.setIn(change.path, change.to);
			}
			if (options.pruneConfig) {
				for (const removal of item.removals) {
					item.document.deleteIn(removal.path);
					pruneEmptyParents(item.document, removal.path);
				}
			}
			mkdirSync(dirname(item.target.absolute), { recursive: true });
			const body = item.document.toString();
			writeFileSync(
				item.target.absolute,
				item.target.exists ? body : `${fileHeader(item.domain)}${body}`,
				"utf8",
			);
		} catch (error) {
			fail("写入配置 YAML", error, `文件：${item.target.relative}`);
		}
	}
	log(`已写入 ${configWrites.length} 个配置文件。`);
}

if (footerWrite) {
	try {
		writeExported(footerWrite.repoAbsolute, footerWrite.contentAbsolute);
		log(`已导出 ${footerWrite.content}。`);
	} catch (error) {
		fail(
			"写入自定义页脚",
			error,
			`${footerWrite.repo} -> ${footerWrite.content}`,
		);
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. 写后校验：导出的 YAML 必须能通过 tsc
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 用生产链路自己的校验器复查刚写出的 YAML。
 *
 * 走的是 `content:sync` 的同一条路径（读 YAML -> 生成带类型标注的 TS -> 跑 tsc），
 * 不另立 schema。生成物要落盘才能被 tsc 读到，因此写入后在 `finally` 里原样还原——
 * 导出绝不留下对代码仓的改动。
 */
function validateExportedConfig() {
	const entries = readConfigOverrides(join(targetRoot, CONFIG_DIRECTORY));
	if (entries.length === 0) return "skipped";

	const { source, lineOwners } = generateModule(entries);
	const targetPath = join(ROOT, GENERATED_CONFIG_FILE);
	const existed = existsSync(targetPath);
	const previous = existed ? readFileSync(targetPath, "utf8") : null;

	if (!existsSync(join(ROOT, "node_modules", "typescript", "bin", "tsc"))) {
		return "no-typescript";
	}

	try {
		mkdirSync(dirname(targetPath), { recursive: true });
		writeFileSync(targetPath, source);
		typeCheckModule(ROOT, lineOwners);
		return "ok";
	} finally {
		if (existed) writeFileSync(targetPath, previous);
		else rmSync(targetPath, { force: true });
	}
}

if (options.scopeConfig && (configWrites.length > 0 || footerWrite)) {
	let result;
	try {
		result = validateExportedConfig();
	} catch (error) {
		fail(
			"校验导出的配置",
			error,
			"导出的 YAML 没有通过主题的类型校验。文件已经写进内容仓，" +
				" 请按上面的键路径修正，或从快照备份还原后重试——" +
				" 把过不了校验的 YAML 留在内容仓，会让内容仓的下一次 CI 直接失败。",
		);
	}
	if (result === "no-typescript") {
		warn(
			"找不到本地 typescript，已跳过导出后的类型校验。请运行 pnpm install 后用 pnpm content:validate 补验。",
		);
	} else if (result === "ok") {
		log("导出的配置已通过类型校验（与 content:sync 用的是同一条校验路径）。");
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. 收尾体检
// ─────────────────────────────────────────────────────────────────────────────

log(`导出完成，目标内容仓：${toPosix(targetRoot)}`);
log("后续步骤：");
log(`  1. cd ${targetRoot} && git status   # 逐条复核 diff`);
log("  2. 在内容仓 commit & push（本脚本刻意不替你提交）");
log("  3. 回到代码仓跑 pnpm content:sync，让物化产物与内容仓重新对齐");

warn(
	"代码仓的 src/content/、src/data/ 等仍是**物化产物**：下一次 content:sync 以内容仓为准，" +
		" 未导出的本地改动仍会被裁剪掉。",
);

if (filePlan.prunable.length > 0 && !options.prune) {
	log(
		`内容仓另有 ${filePlan.prunable.length} 个文件在代码仓中不存在，本次未删除。` +
			" 若确认它们该被清理，复核上面的清单后加 --prune 重跑（会先备份）。",
	);
}

if (contentRepo.isGit) {
	const after =
		runGit(targetRoot, ["status", "--porcelain", "-z", "-uall"], {
			allowFailure: true,
		}) ?? "";
	const changed = after.split("\0").filter(Boolean).length;
	log(
		changed === 0
			? "内容仓 git status 干净：本次导出没有产生实际差异（写入的内容与既有文件等价）。"
			: `内容仓现有 ${changed} 处未提交改动待你复核。`,
	);
}

if (backupDirectory) {
	log(`快照备份保留在 ${backupDirectory}，确认无需回滚后可自行删除。`);
}

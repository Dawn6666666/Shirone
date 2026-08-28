/**
 * 内容源解析：决定当前构建从哪里取「内容」（文章 / 说说 / 站点数据 / 用户资产）。
 *
 * 两种模式：
 * - `local`（默认）：仓库自带内容，行为与未引入内容分离前完全一致；
 * - `external`：内容来自独立的内容仓库，由 `scripts/content/sync.mjs` 物化到仓内标准路径。
 *
 * 契约与使用方式见 `docs/content-separation.md`。
 */

import { existsSync, readFileSync, realpathSync } from "node:fs";
import {
	basename,
	dirname,
	isAbsolute,
	join,
	normalize,
	relative,
	resolve,
	sep,
	win32,
} from "node:path";

/** 代码仓根目录下的内容分离清单文件名。 */
export const MANIFEST_FILE = "shirone.content.json";

/** `type: "git"` 时内容仓工作副本的落盘目录（已 gitignore）。 */
export const WORKING_COPY_DIR = ".content-src";

/** 每次物化后写出的溯源文件（已 gitignore）。 */
export const LOCK_FILE = "content.lock.json";

/** 当前支持的清单结构版本。 */
export const SUPPORTED_SCHEMA_VERSION = 1;

/**
 * 默认挂载表：`内容仓目录` -> `代码仓目录`。
 * 保持这一映射意味着 `banner.src: "assets/images/..."` 等现存配置写法语义不变。
 */
export const DEFAULT_MOUNTS = Object.freeze({
	content: "src/content",
	data: "src/data",
	assets: "src/assets",
	public: "public",
});

/**
 * 构建期生成物：既不接受内容仓覆盖，也不参与裁剪。
 *
 * 这些路径与内容仓可能拥有的目录共享同一个顶层段（如 `public/assets/`），
 * 若不豁免，会在每次同步时被误删并触发不必要的重新生成。
 */
export const PROTECTED_PATHS = Object.freeze([
	"public/assets/anime/covers/**",
	"public/assets/moments/thumbnails/**",
	"src/assets/fonts/.subset/**",
]);

const DISABLED_VALUES = new Set(["0", "false", "off", "no"]);

function isDisabled(value) {
	return value !== undefined && DISABLED_VALUES.has(value.trim().toLowerCase());
}

function readEnv(name) {
	const raw = process.env[name];
	if (raw === undefined) return undefined;
	const trimmed = raw.trim();
	// 沿用「空字符串等于未设置」的约定，便于在 CI 里用空值关闭某个来源。
	return trimmed === "" ? undefined : trimmed;
}

/** 去掉 URL 中的凭据，避免 token 出现在日志里。 */
export function redactUrl(url) {
	if (typeof url !== "string") return String(url);
	return url
		.replace(/([a-z][a-z0-9+.-]*:\/\/)[^/\s@]*@/gi, "$1***@")
		.replace(
			/([?&][^=&#\s]*(?:auth|key|password|secret|sig|signature|token)[^=&#\s]*=)[^&#\s]*/gi,
			"$1***",
		);
}

/** 归一化仓库 URL，供 origin / lock 身份比对；凭据与 query 不参与仓库身份。 */
export function canonicalGitUrl(url) {
	return redactUrl(String(url).trim())
		.replace(/[?#].*$/, "")
		.replace(/\.git\/?$/i, "")
		.replace(/\/$/, "");
}

/**
 * 解析路径中已经存在的部分，以便识别指向其他目录的符号链接或 Windows junction。
 * 不存在的尾部保持原样，因此该函数不会为了比较路径而创建目录。
 */
function resolvePhysicalPath(value) {
	let current = resolve(value);
	const missingSegments = [];
	while (!existsSync(current)) {
		const parent = dirname(current);
		if (parent === current) return resolve(value);
		missingSegments.unshift(basename(current));
		current = parent;
	}
	return resolve(realpathSync(current), ...missingSegments);
}

/** 判断两个绝对或相对路径是否相同、互为父子目录，并解析已存在的链接路径。 */
export function pathsOverlap(left, right) {
	const physicalLeft = resolvePhysicalPath(left);
	const physicalRight = resolvePhysicalPath(right);
	const contains = (parent, child) => {
		const difference = relative(parent, child);
		return (
			difference === "" ||
			(!isAbsolute(difference) &&
				difference !== ".." &&
				!difference.startsWith(`..${sep}`))
		);
	};
	return (
		contains(physicalLeft, physicalRight) ||
		contains(physicalRight, physicalLeft)
	);
}

/** 把 glob 子集（`**` 与 `*`）编译成正则；仅支持 POSIX 风格的相对路径。 */
function compilePattern(pattern) {
	const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
	const expanded = escaped.replace(/\*\*|\*/g, (token) =>
		token === "**" ? ".*" : "[^/]*",
	);
	return new RegExp(`^${expanded}$`);
}

/**
 * 判断仓库相对路径是否命中任一模式。
 * @param {string} repoRelativePath 以 `/` 分隔的仓库相对路径
 * @param {readonly string[]} patterns
 */
export function matchesAny(repoRelativePath, patterns) {
	return patterns.some((pattern) =>
		compilePattern(pattern).test(repoRelativePath),
	);
}

/** 取相对路径的顶层段；根级文件返回空字符串。 */
export function topSegment(relativePath) {
	const index = relativePath.indexOf("/");
	return index === -1 ? "" : relativePath.slice(0, index);
}

/** 统一成 POSIX 分隔符，便于与模式和集合比对。 */
export function toPosix(value) {
	return value.split(sep).join("/");
}

function fail(message) {
	throw new Error(`[content] ${message}`);
}

function readManifest(root) {
	const manifestPath = join(root, MANIFEST_FILE);
	if (!existsSync(manifestPath)) return { manifestPath, manifest: null };

	let parsed;
	try {
		// 去 BOM：Windows 编辑器写出的 JSON 常带 BOM，JSON.parse 会直接抛错。
		parsed = JSON.parse(readFileSync(manifestPath, "utf8").trim());
	} catch (error) {
		fail(`${MANIFEST_FILE} 不是合法 JSON：${error.message}`);
	}
	if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
		fail(`${MANIFEST_FILE} 顶层必须是对象。`);
	}
	return { manifestPath, manifest: parsed };
}

function resolveSchemaVersion(manifest) {
	const version = manifest.schemaVersion ?? SUPPORTED_SCHEMA_VERSION;
	if (!Number.isInteger(version) || version < 1) {
		fail(`${MANIFEST_FILE} 的 schemaVersion 必须是不小于 1 的整数。`);
	}
	if (version > SUPPORTED_SCHEMA_VERSION) {
		fail(
			`${MANIFEST_FILE} 声明 schemaVersion ${version}，当前主题只支持到 ${SUPPORTED_SCHEMA_VERSION}。` +
				" 请升级主题代码，或把内容仓的清单降级。",
		);
	}
	return version;
}

function resolveSource(manifest, envOrigins) {
	const envDir = readEnv("CONTENT_DIR");
	if (envDir) {
		return {
			type: "path",
			path: envDir,
			origin: "CONTENT_DIR",
			originLocation: envOrigins.get("CONTENT_DIR") ?? "environment",
		};
	}

	const envUrl = readEnv("CONTENT_REPO_URL");
	if (envUrl) {
		const envRef = readEnv("CONTENT_REPO_REF");
		return {
			type: "git",
			url: envUrl,
			ref: envRef ?? manifest?.source?.ref ?? "main",
			origin: "CONTENT_REPO_URL",
			originLocation: envOrigins.get("CONTENT_REPO_URL") ?? "environment",
			refOrigin: envRef
				? (envOrigins.get("CONTENT_REPO_REF") ?? "environment")
				: manifest?.source?.ref
					? "manifest"
					: "default",
		};
	}

	const declared = manifest?.source;
	if (!declared) return null;
	if (typeof declared !== "object" || Array.isArray(declared)) {
		fail(`${MANIFEST_FILE} 的 source 必须是对象。`);
	}

	if (declared.type === "path") {
		if (!declared.path) fail(`${MANIFEST_FILE} 的 source.path 不能为空。`);
		return {
			type: "path",
			path: declared.path,
			origin: MANIFEST_FILE,
			originLocation: "manifest",
		};
	}
	if (declared.type === "git") {
		if (!declared.url) fail(`${MANIFEST_FILE} 的 source.url 不能为空。`);
		const envRef = readEnv("CONTENT_REPO_REF");
		return {
			type: "git",
			url: declared.url,
			ref: envRef ?? declared.ref ?? "main",
			origin: MANIFEST_FILE,
			originLocation: "manifest",
			refOrigin: envRef
				? (envOrigins.get("CONTENT_REPO_REF") ?? "environment")
				: declared.ref
					? "manifest"
					: "default",
		};
	}
	fail(
		`${MANIFEST_FILE} 的 source.type 只能是 "path" 或 "git"，收到 ${JSON.stringify(declared.type)}。`,
	);
}

const RESERVED_MOUNT_SOURCE_ROOTS = new Set([".git", "node_modules"]);
const RESERVED_MOUNT_TARGET_ROOTS = new Set([
	".git",
	".astro",
	".content-backup",
	".content-src",
	".export-backup",
	"node_modules",
	"scripts",
	"tests",
]);

function normalizeMountDirectory(value, label) {
	if (typeof value !== "string" || value.trim() === "") {
		fail(`${label} 必须是非空字符串。`);
	}
	const raw = value.trim();
	const rawSegments = toPosix(raw).split("/");
	const normalized = toPosix(normalize(raw)).replace(/\/$/, "");
	if (
		isAbsolute(raw) ||
		win32.isAbsolute(raw) ||
		normalized === "." ||
		rawSegments.includes("..") ||
		normalized.split("/").includes("..")
	) {
		fail(`${label} 必须是不含 ".." 的相对目录，收到 ${value}。`);
	}
	return normalized;
}

function relativeDirectoriesOverlap(left, right) {
	const normalizedLeft = left.toLowerCase();
	const normalizedRight = right.toLowerCase();
	return (
		normalizedLeft === normalizedRight ||
		normalizedLeft.startsWith(`${normalizedRight}/`) ||
		normalizedRight.startsWith(`${normalizedLeft}/`)
	);
}

function validateMountBoundaries(mounts) {
	const entries = [...mounts.entries()];
	for (const [source, target] of entries) {
		const sourceRoot = source.split("/")[0].toLowerCase();
		const targetRoot = target.split("/")[0].toLowerCase();
		if (RESERVED_MOUNT_SOURCE_ROOTS.has(sourceRoot)) {
			fail(`mounts.${source} 不能读取保留目录 ${sourceRoot}/。`);
		}
		if (target.toLowerCase() === "src") {
			fail(
				`mounts.${source} 指向整个 src/，范围过于宽泛，请使用更具体的目标目录。`,
			);
		}
		if (RESERVED_MOUNT_TARGET_ROOTS.has(targetRoot)) {
			fail(`mounts.${source} 不能写入保留目录 ${targetRoot}/。`);
		}
	}

	for (let left = 0; left < entries.length; left += 1) {
		for (let right = left + 1; right < entries.length; right += 1) {
			const [leftSource, leftTarget] = entries[left];
			const [rightSource, rightTarget] = entries[right];
			if (relativeDirectoriesOverlap(leftSource, rightSource)) {
				fail(
					`挂载源 ${leftSource}/ 与 ${rightSource}/ 相互交叠，会重复读取同一批文件。`,
				);
			}
			if (relativeDirectoriesOverlap(leftTarget, rightTarget)) {
				fail(
					`挂载目标 ${leftTarget}/ 与 ${rightTarget}/ 相互交叠，会造成覆盖或错误裁剪。`,
				);
			}
		}
	}
}

function resolveMounts(manifest) {
	const overrides = manifest?.mounts;
	if (overrides === undefined) return { ...DEFAULT_MOUNTS };
	if (
		overrides === null ||
		typeof overrides !== "object" ||
		Array.isArray(overrides)
	) {
		fail(`${MANIFEST_FILE} 的 mounts 必须是对象。`);
	}

	const mounts = new Map(Object.entries(DEFAULT_MOUNTS));
	const normalizedOverrideSources = new Map();
	for (const [rawSourceDir, target] of Object.entries(overrides)) {
		const sourceDir = normalizeMountDirectory(
			rawSourceDir,
			`mounts 的源目录 ${JSON.stringify(rawSourceDir)}`,
		);
		const duplicate = normalizedOverrideSources.get(sourceDir.toLowerCase());
		if (duplicate !== undefined) {
			fail(
				`mounts 的源目录 ${JSON.stringify(rawSourceDir)} 与 ${JSON.stringify(duplicate)} 归一化后重复。`,
			);
		}
		normalizedOverrideSources.set(sourceDir.toLowerCase(), rawSourceDir);
		if (target === null || target === false) {
			// 显式关闭某个挂载点。
			mounts.delete(sourceDir);
			continue;
		}
		if (typeof target !== "string" || target.trim() === "") {
			fail(`mounts.${sourceDir} 必须是非空字符串、null 或 false。`);
		}
		mounts.set(
			sourceDir,
			normalizeMountDirectory(target, `mounts.${sourceDir}`),
		);
	}
	validateMountBoundaries(mounts);
	return Object.fromEntries(mounts);
}

function resolveKeep(manifest) {
	const keep = manifest?.keep;
	if (keep === undefined) return [];
	if (!Array.isArray(keep) || keep.some((item) => typeof item !== "string")) {
		fail(`${MANIFEST_FILE} 的 keep 必须是字符串数组。`);
	}
	return keep.map(toPosix);
}

/**
 * 解析当前生效的内容源。
 *
 * 优先级：`SHIRONE_CONTENT_SYNC=0` > `CONTENT_DIR` > `CONTENT_REPO_URL` > 清单 `source`。
 * 全部缺失时返回 `local` 模式，调用方应当什么都不做。
 *
 * @param {string} [root] 代码仓根目录
 */
export function resolveContentSource(root = process.cwd()) {
	// 进程环境变量优先；文件之间按 .env.local > .env 覆盖。
	const inheritedEnvKeys = new Set(Object.keys(process.env));
	const envOrigins = new Map();
	for (const file of [".env", ".env.local"]) {
		const envPath = join(root, file);
		if (!existsSync(envPath)) continue;
		try {
			const content = readFileSync(envPath, "utf-8");
			for (const line of content.split(/\r?\n/)) {
				const trimmed = line.trim();
				if (!trimmed || trimmed.startsWith("#")) continue;
				const eqIndex = trimmed.indexOf("=");
				if (eqIndex === -1) continue;
				const key = trimmed.slice(0, eqIndex).trim();
				let val = trimmed.slice(eqIndex + 1).trim();
				if (
					(val.startsWith('"') && val.endsWith('"')) ||
					(val.startsWith("'") && val.endsWith("'"))
				) {
					val = val.slice(1, -1);
				}
				if (key && !inheritedEnvKeys.has(key)) {
					process.env[key] = val;
					envOrigins.set(key, file);
				}
			}
		} catch {
			// 忽略解析错误
		}
	}

	if (isDisabled(process.env.SHIRONE_CONTENT_SYNC)) {
		return {
			mode: "local",
			reason: "SHIRONE_CONTENT_SYNC 已显式关闭",
			reasonLocation: envOrigins.get("SHIRONE_CONTENT_SYNC") ?? "environment",
		};
	}

	const { manifestPath, manifest } = readManifest(root);
	const source = resolveSource(manifest, envOrigins);
	if (!source) {
		return {
			mode: "local",
			reason: manifest
				? `${MANIFEST_FILE} 未声明 source`
				: `未找到 ${MANIFEST_FILE}，也未设置 CONTENT_DIR / CONTENT_REPO_URL`,
		};
	}

	return {
		mode: "external",
		schemaVersion: manifest
			? resolveSchemaVersion(manifest)
			: SUPPORTED_SCHEMA_VERSION,
		source,
		mounts: resolveMounts(manifest),
		keep: resolveKeep(manifest),
		prune: manifest?.prune !== false,
		manifestPath: manifest ? manifestPath : null,
	};
}

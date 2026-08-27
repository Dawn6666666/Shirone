/**
 * 内容源解析：决定当前构建从哪里取「内容」（文章 / 说说 / 站点数据 / 用户资产）。
 *
 * 两种模式：
 * - `local`（默认）：仓库自带内容，行为与未引入内容分离前完全一致；
 * - `external`：内容来自独立的内容仓库，由 `scripts/content/sync.mjs` 物化到仓内标准路径。
 *
 * 契约与使用方式见 `docs/content-separation.md`。
 */

import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, normalize, sep } from "node:path";

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
	return url.replace(/\/\/[^/@]*@/, "//***@");
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

function resolveSource(manifest) {
	const envDir = readEnv("CONTENT_DIR");
	if (envDir) {
		return { type: "path", path: envDir, origin: "CONTENT_DIR" };
	}

	const envUrl = readEnv("CONTENT_REPO_URL");
	if (envUrl) {
		return {
			type: "git",
			url: envUrl,
			ref: readEnv("CONTENT_REPO_REF") ?? manifest?.source?.ref ?? "main",
			origin: "CONTENT_REPO_URL",
		};
	}

	const declared = manifest?.source;
	if (!declared) return null;
	if (typeof declared !== "object" || Array.isArray(declared)) {
		fail(`${MANIFEST_FILE} 的 source 必须是对象。`);
	}

	if (declared.type === "path") {
		if (!declared.path) fail(`${MANIFEST_FILE} 的 source.path 不能为空。`);
		return { type: "path", path: declared.path, origin: MANIFEST_FILE };
	}
	if (declared.type === "git") {
		if (!declared.url) fail(`${MANIFEST_FILE} 的 source.url 不能为空。`);
		return {
			type: "git",
			url: declared.url,
			ref: readEnv("CONTENT_REPO_REF") ?? declared.ref ?? "main",
			origin: MANIFEST_FILE,
		};
	}
	fail(
		`${MANIFEST_FILE} 的 source.type 只能是 "path" 或 "git"，收到 ${JSON.stringify(declared.type)}。`,
	);
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

	const mounts = { ...DEFAULT_MOUNTS };
	for (const [sourceDir, target] of Object.entries(overrides)) {
		if (target === null || target === false) {
			// 显式关闭某个挂载点。
			delete mounts[sourceDir];
			continue;
		}
		if (typeof target !== "string" || target === "") {
			fail(`mounts.${sourceDir} 必须是非空字符串、null 或 false。`);
		}
		if (
			isAbsolute(target) ||
			toPosix(normalize(target)).split("/").includes("..")
		) {
			fail(
				`mounts.${sourceDir} 必须是不含 ".." 的仓库相对路径，收到 ${target}。`,
			);
		}
		mounts[sourceDir] = toPosix(normalize(target));
	}
	return mounts;
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
	if (isDisabled(process.env.SHIRONE_CONTENT_SYNC)) {
		return { mode: "local", reason: "SHIRONE_CONTENT_SYNC 已显式关闭" };
	}

	const { manifestPath, manifest } = readManifest(root);
	const source = resolveSource(manifest);
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

import { existsSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import type { Plugin } from "vite";
import { normalisePath } from "./paths.ts";
import type { ResolvedShironesPaths } from "./types.ts";

/**
 * Extensions probed when a user override is looked up without one.
 * Order matters: the first hit wins.
 */
const CONFIG_EXTENSIONS = [".ts", ".mts", ".js", ".mjs"];
const COMPONENT_EXTENSIONS = [".astro", ".svelte", ".ts", ".js"];

function probe(basePath: string, extensions: string[]): string | null {
	// Exact path first (the importer already carried an extension).
	if (extname(basePath) && existsSync(basePath)) return basePath;

	const withoutExt = basePath.replace(/\.(ts|mts|js|mjs|astro|svelte)$/, "");
	for (const ext of extensions) {
		const candidate = `${withoutExt}${ext}`;
		if (existsSync(candidate)) return candidate;
	}
	return null;
}

export interface OverlayTarget {
	/** Directory inside the package that may be overridden. */
	packageDir: string;
	/** Directory in the user's project that takes precedence. */
	userDir: string;
	/** Extensions probed when resolving. */
	extensions: string[];
	/** Human readable label used in debug logs. */
	label: string;
}

/**
 * Build the overlay table describing which package directories can be shadowed
 * by files in the user's project.
 *
 * | package                | user project                  |
 * |------------------------|-------------------------------|
 * | `src/config/*`         | `shirones/config/*`           |
 * | `src/data/*`           | `shirones/config/data/*`      |
 * | `src/components/**`    | `src/components/**`           |
 * | `src/layouts/**`       | `src/layouts/**`              |
 */
export function createOverlayTargets(paths: ResolvedShironesPaths): OverlayTarget[] {
	return [
		{
			label: "config",
			packageDir: join(paths.packageSrc, "config"),
			userDir: paths.configDir,
			extensions: CONFIG_EXTENSIONS,
		},
		{
			label: "data",
			packageDir: join(paths.packageSrc, "data"),
			userDir: paths.dataDir,
			extensions: CONFIG_EXTENSIONS,
		},
		{
			label: "components",
			packageDir: join(paths.packageSrc, "components"),
			userDir: join(paths.projectRoot, "src", "components"),
			extensions: COMPONENT_EXTENSIONS,
		},
		{
			label: "layouts",
			packageDir: join(paths.packageSrc, "layouts"),
			userDir: join(paths.projectRoot, "src", "layouts"),
			extensions: COMPONENT_EXTENSIONS,
		},
	];
}

/**
 * Resolve a package-internal path to a user override, if one exists.
 * Returns `null` when the path is not overridable or no override is present.
 */
export function resolveOverride(
	targets: OverlayTarget[],
	absolutePath: string,
): string | null {
	const normalised = normalisePath(absolutePath);

	for (const target of targets) {
		const packageDir = normalisePath(target.packageDir);
		if (!normalised.startsWith(`${packageDir}/`)) continue;

		const rel = relative(target.packageDir, absolutePath);
		// `index.ts` barrels stay owned by the package: overriding them would
		// break the named-export contract the theme relies on.
		if (/^index\.(ts|js|mts|mjs)$/.test(rel)) continue;

		const hit = probe(join(target.userDir, rel), target.extensions);
		if (hit) return hit;
	}
	return null;
}

export interface OverlayPluginOptions {
	paths: ResolvedShironesPaths;
	/** Explicit component override map from `ShironesOptions.components`. */
	components?: Record<string, string>;
	/** Emit a line per applied override. */
	verbose?: boolean;
}

/**
 * Vite plugin implementing Shirone's component/config override system.
 *
 * Unlike a plain alias table this hooks `resolveId` *after* the default
 * resolution, which means it catches **both** aliased imports (`@/config/...`)
 * and deep relative imports (`../data/music.ts`) with one mechanism.
 */
export function shironesOverlay(options: OverlayPluginOptions): Plugin {
	const { paths, components = {}, verbose = false } = options;
	const targets = createOverlayTargets(paths);
	const applied = new Set<string>();

	// Pre-resolve the explicit override map to absolute paths.
	const explicit = new Map<string, string>();
	for (const [key, value] of Object.entries(components)) {
		const target = resolve(paths.projectRoot, value);
		if (!existsSync(target)) {
			throw new Error(
				`[shirones] Component override "${key}" points at "${value}", which does not exist ` +
					`(resolved to ${target}).`,
			);
		}
		explicit.set(normalisePath(key).replace(/\.(astro|svelte|ts|js)$/, ""), target);
	}

	function explicitOverrideFor(absolutePath: string): string | null {
		const componentsDir = normalisePath(join(paths.packageSrc, "components"));
		const layoutsDir = normalisePath(join(paths.packageSrc, "layouts"));
		const normalised = normalisePath(absolutePath);

		for (const [dir, prefix] of [
			[componentsDir, ""],
			[layoutsDir, "layouts/"],
		] as const) {
			if (!normalised.startsWith(`${dir}/`)) continue;
			const key = `${prefix}${normalised.slice(dir.length + 1)}`.replace(
				/\.(astro|svelte|ts|js)$/,
				"",
			);
			const hit = explicit.get(key);
			if (hit) return hit;
		}
		return null;
	}

	return {
		name: "shirones:overlay",
		enforce: "pre",

		async resolveId(source, importer, resolveOptions) {
			// Avoid infinite recursion through our own hook.
			if (resolveOptions?.custom?.["shirones:overlay"]) return null;

			const resolved = await this.resolve(source, importer, {
				...resolveOptions,
				skipSelf: true,
				custom: { ...resolveOptions?.custom, "shirones:overlay": true },
			});
			if (!resolved || resolved.external) return resolved;

			// Strip Vite/Astro query suffixes (`?raw`, `?url`, `?astro&type=...`).
			const [cleanPath, query = ""] = resolved.id.split("?");
			const suffix = query ? `?${query}` : "";

			const override =
				explicitOverrideFor(cleanPath) ?? resolveOverride(targets, cleanPath);
			if (!override) return resolved;

			if (verbose && !applied.has(cleanPath)) {
				applied.add(cleanPath);
				console.log(
					`[shirones] override ${relative(paths.packageSrc, cleanPath)} -> ${relative(
						paths.projectRoot,
						override,
					)}`,
				);
			}

			return { ...resolved, id: `${override}${suffix}` };
		},
	};
}

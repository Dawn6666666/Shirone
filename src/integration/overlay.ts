import { existsSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
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

/** Theme path aliases, mapped to sub-directories of the package `src/`. */
const ALIAS_MAP: [string, string][] = [
	["@components/", "components/"],
	["@utils/", "utils/"],
	["@layouts/", "layouts/"],
	["@i18n/", "i18n/"],
	["@constants/", "constants/"],
	["@assets/", "assets/"],
	// `@/` is the broadest pattern and must be tested last.
	["@/", ""],
];

/** Split a Vite id into its path and query (`?raw`, `?url`, `?astro&type=…`). */
function splitQuery(id: string): [string, string] {
	const index = id.indexOf("?");
	return index === -1 ? [id, ""] : [id.slice(0, index), id.slice(index)];
}

/**
 * Vite plugin implementing Shirone's component/config override system.
 *
 * It deliberately resolves candidates itself instead of delegating to
 * `this.resolve()`. An earlier version round-tripped every specifier through
 * the resolver so it could inspect the final path; that also intercepted bare
 * package specifiers such as `shirones/collections` and broke them. Now the
 * plugin only reacts to the two shapes that can possibly reference theme
 * internals — alias imports and relative imports from inside the package —
 * and returns `null` for everything else, leaving Vite's resolution untouched.
 */
export function shironesOverlay(options: OverlayPluginOptions): Plugin {
	const { paths, components = {}, verbose = false } = options;
	const targets = createOverlayTargets(paths);
	const packageSrc = normalisePath(paths.packageSrc);
	const logged = new Set<string>();

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

	/** Explicit-map lookup for an absolute path inside the package. */
	function explicitOverrideFor(absolutePath: string): string | null {
		if (explicit.size === 0) return null;
		const normalised = normalisePath(absolutePath);

		for (const [dir, prefix] of [
			[normalisePath(join(paths.packageSrc, "components")), ""],
			[normalisePath(join(paths.packageSrc, "layouts")), "layouts/"],
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

	/** Map an alias specifier onto an absolute path inside the package. */
	function resolveAlias(source: string): string | null {
		for (const [prefix, sub] of ALIAS_MAP) {
			if (!source.startsWith(prefix)) continue;
			return join(paths.packageSrc, sub, source.slice(prefix.length));
		}
		return null;
	}

	function overrideFor(absolutePath: string): string | null {
		return explicitOverrideFor(absolutePath) ?? resolveOverride(targets, absolutePath);
	}

	function report(from: string, to: string): void {
		if (!verbose || logged.has(from)) return;
		logged.add(from);
		console.log(
			`[shirones] override ${relative(paths.packageSrc, from)} → ${relative(
				paths.projectRoot,
				to,
			)}`,
		);
	}

	return {
		name: "shirones:overlay",
		enforce: "pre",

		resolveId(source, importer) {
			const [sourcePath, query] = splitQuery(source);

			// ── Case 1: theme alias (`@/config/siteConfig`, `@components/…`) ──
			const aliased = resolveAlias(sourcePath);
			if (aliased) {
				const override = overrideFor(aliased);
				if (override) {
					report(aliased, override);
					return `${override}${query}`;
				}
				// Not overridden: let `resolve.alias` handle it as usual.
				return null;
			}

			// ── Case 2: relative import from a file inside the package ────────
			if (!importer || !sourcePath.startsWith(".")) return null;

			const [importerPath] = splitQuery(importer);
			if (!normalisePath(importerPath).startsWith(`${packageSrc}/`)) return null;

			const candidate = resolve(dirname(importerPath), sourcePath);
			const override = overrideFor(candidate);
			if (!override) return null;

			report(candidate, override);
			return `${override}${query}`;
		},
	};
}

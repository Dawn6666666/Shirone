#!/usr/bin/env node
/**
 * Shirone CLI.
 *
 *   npx shirones init      scaffold config, content and static assets
 *   npx shirones init --force
 *   npx shirones info      print resolved paths and the injected route table
 *
 * The command is intentionally dependency-free so it can run via `npx` in a
 * bare project before anything else is installed.
 */

import { existsSync } from "node:fs";
import { cp, mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const TEMPLATE_DIR = join(PACKAGE_ROOT, "template");
const CWD = process.cwd();

/** Directory holding user content. Fixed by convention, matches the package name. */
const CONTENT_ROOT = "shirones";

const colours = {
	reset: "\u001b[0m",
	bold: "\u001b[1m",
	dim: "\u001b[2m",
	green: "\u001b[32m",
	yellow: "\u001b[33m",
	red: "\u001b[31m",
	cyan: "\u001b[36m",
};

const log = {
	step: (msg) => console.log(`${colours.cyan}›${colours.reset} ${msg}`),
	ok: (msg) => console.log(`${colours.green}✓${colours.reset} ${msg}`),
	skip: (msg) => console.log(`${colours.dim}·${colours.reset} ${colours.dim}${msg}${colours.reset}`),
	warn: (msg) => console.log(`${colours.yellow}!${colours.reset} ${msg}`),
	err: (msg) => console.error(`${colours.red}✗${colours.reset} ${msg}`),
};

async function readPackageName() {
	try {
		const raw = await readFile(join(PACKAGE_ROOT, "package.json"), "utf8");
		return JSON.parse(raw).name ?? "shirones";
	} catch {
		return "shirones";
	}
}

async function copyEntry(from, to, { force }) {
	if (!existsSync(from)) return { copied: false, reason: "missing" };
	if (existsSync(to) && !force) {
		log.skip(`${relative(CWD, to) || "."} already exists (use --force to overwrite)`);
		return { copied: false, reason: "exists" };
	}
	await mkdir(dirname(to), { recursive: true });
	await cp(from, to, { recursive: true, force: true });
	log.ok(relative(CWD, to) || ".");
	return { copied: true };
}

async function countFiles(dir) {
	if (!existsSync(dir)) return 0;
	let total = 0;
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		total += entry.isDirectory() ? await countFiles(join(dir, entry.name)) : 1;
	}
	return total;
}

/**
 * Peers the user's project must depend on directly.
 *
 * Some tooling resolves from the project root rather than from the importing
 * file, and pnpm's strict layout hides the theme's own dependencies there:
 * `@astrojs/svelte` registers `svelte/*` subpaths in `optimizeDeps.include`,
 * and astro-icon loads `@iconify-json/*` sets through `require.resolve` in
 * Node. Installing them at the root is the only thing that satisfies both.
 *
 * The list is derived from the package's own `peerDependencies`, minus
 * `astro`, which the user necessarily already has.
 */
const PEERS_PROVIDED_BY_USER = ["astro"];

/** Dependencies whose install scripts must be allowed to run. */
const BUILT_DEPENDENCIES = ["esbuild", "sharp"];

/**
 * Build-script approval.
 *
 * pnpm refuses to silently skip a dependency's install script, and `sharp`
 * (Astro's image optimisation) needs its. The setting moved between majors —
 * `allowBuilds` in pnpm 11, `onlyBuiltDependencies` in pnpm 10 — so both are
 * written. npm and yarn ignore this file entirely.
 */
/**
 * Approve the install scripts the theme needs (`sharp` for image optimisation,
 * `esbuild` for loading the TypeScript config).
 *
 * pnpm 11 renamed the setting to an `allowBuilds` map in `pnpm-workspace.yaml`
 * and no longer reads the `pnpm` field of `package.json`; pnpm 10 still wants
 * the `onlyBuiltDependencies` list. We write both. When a failed install has
 * already left pnpm's own placeholder behind
 * (`esbuild: set this to true or false`), we flip it to `true` instead of
 * treating the file as configured.
 */
async function ensurePnpmWorkspace() {
	const file = join(CWD, "pnpm-workspace.yaml");
	const allowBlock = [
		"allowBuilds:",
		...BUILT_DEPENDENCIES.map((dep) => `  ${dep}: true`),
	].join("\n");
	const onlyBlock = [
		"onlyBuiltDependencies:",
		...BUILT_DEPENDENCIES.map((dep) => `  - ${dep}`),
	].join("\n");

	if (!existsSync(file)) {
		await writeFile(
			file,
			"# Lets these dependencies run their install scripts.\n" +
				"# sharp powers Astro's image optimisation and will not work without it.\n" +
				`${allowBlock}\n${onlyBlock}\n`,
			"utf8",
		);
		log.ok("pnpm-workspace.yaml");
		return;
	}

	const original = await readFile(file, "utf8");
	let lines = original.split("\n");

	const allowIndex = lines.findIndex((line) => /^allowBuilds:\s*$/.test(line));
	if (allowIndex === -1) {
		lines = [...lines.join("\n").trimEnd().split("\n"), "", ...allowBlock.split("\n")];
	} else {
		// Rewrite the whole indented block so placeholders become `true`.
		let end = allowIndex + 1;
		while (end < lines.length && /^\s+\S/.test(lines[end])) end += 1;
		const existing = lines.slice(allowIndex + 1, end);
		const kept = existing.filter((line) => {
			const name = line.trim().split(":")[0];
			return !BUILT_DEPENDENCIES.includes(name);
		});
		lines = [
			...lines.slice(0, allowIndex + 1),
			...BUILT_DEPENDENCIES.map((dep) => `  ${dep}: true`),
			...kept,
			...lines.slice(end),
		];
	}

	if (!lines.some((line) => /^onlyBuiltDependencies:\s*$/.test(line))) {
		lines = [...lines.join("\n").trimEnd().split("\n"), ...onlyBlock.split("\n")];
	}

	const next = `${lines.join("\n").trimEnd()}\n`;
	if (next === original) {
		log.skip("pnpm-workspace.yaml already configured");
		return;
	}
	await writeFile(file, next, "utf8");
	log.ok("pnpm-workspace.yaml");
}

async function ensurePackageJsonScripts(packageName) {
	const pkgPath = join(CWD, "package.json");
	if (!existsSync(pkgPath)) return;

	const pkg = JSON.parse(await readFile(pkgPath, "utf8"));
	pkg.scripts ??= {};
	pkg.dependencies ??= {};
	let changed = false;

	const addedPeers = [];
	for (const [peer, range] of Object.entries(await themePeers())) {
		if (PEERS_PROVIDED_BY_USER.includes(peer)) continue;
		if (pkg.dependencies[peer] || pkg.devDependencies?.[peer]) continue;
		pkg.dependencies[peer] = range;
		addedPeers.push(peer);
		changed = true;
	}

	const wanted = {
		dev: "astro dev",
		build: "astro build",
		preview: "astro preview",
		astro: "astro",
	};
	for (const [key, value] of Object.entries(wanted)) {
		if (!pkg.scripts[key]) {
			pkg.scripts[key] = value;
			changed = true;
		}
	}
	if (pkg.type !== "module") {
		pkg.type = "module";
		changed = true;
	}

	// Build-script approval lives in `pnpm-workspace.yaml` (see
	// `ensurePnpmWorkspace`): pnpm 11 ignores the `pnpm` field of package.json
	// and warns about it, so we deliberately do not write it here.
	if (pkg.pnpm && Object.keys(pkg.pnpm).length === 0) {
		delete pkg.pnpm;
		changed = true;
	}

	if (changed) {
		await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
		log.ok("package.json");
	}
	return addedPeers;
}

/** Read the theme's declared peer dependencies. */
async function themePeers() {
	try {
		const raw = await readFile(join(PACKAGE_ROOT, "package.json"), "utf8");
		return JSON.parse(raw).peerDependencies ?? {};
	} catch {
		return {};
	}
}

/**
 * Write a tsconfig that teaches the editor about the theme's path aliases, so
 * `@/types/config` resolves while editing files under `shirones/config/`.
 */
async function ensureTsConfig(packageName, { force }) {
	const tsconfigPath = join(CWD, "tsconfig.json");
	const themeSrc = `./node_modules/${packageName}/src`;

	const desiredPaths = {
		"@/*": [`${themeSrc}/*`],
		"@components/*": [`${themeSrc}/components/*`],
		"@utils/*": [`${themeSrc}/utils/*`],
		"@layouts/*": [`${themeSrc}/layouts/*`],
		"@i18n/*": [`${themeSrc}/i18n/*`],
		"@constants/*": [`${themeSrc}/constants/*`],
		"@assets/*": [`${themeSrc}/assets/*`],
	};

	if (!existsSync(tsconfigPath)) {
		const tsconfig = {
			extends: "astro/tsconfigs/strict",
			include: [".astro/types.d.ts", "**/*"],
			exclude: ["dist", "node_modules"],
			compilerOptions: {
				strictNullChecks: true,
				baseUrl: ".",
				paths: desiredPaths,
			},
		};
		await writeFile(tsconfigPath, `${JSON.stringify(tsconfig, null, 2)}\n`, "utf8");
		log.ok("tsconfig.json");
		return;
	}

	const tsconfig = JSON.parse(await readFile(tsconfigPath, "utf8"));
	tsconfig.compilerOptions ??= {};
	tsconfig.compilerOptions.baseUrl ??= ".";
	tsconfig.compilerOptions.paths ??= {};

	let changed = false;
	for (const [key, value] of Object.entries(desiredPaths)) {
		if (!tsconfig.compilerOptions.paths[key] || force) {
			tsconfig.compilerOptions.paths[key] = value;
			changed = true;
		}
	}
	if (changed) {
		await writeFile(tsconfigPath, `${JSON.stringify(tsconfig, null, 2)}\n`, "utf8");
		log.ok("tsconfig.json (theme path aliases)");
	} else {
		log.skip("tsconfig.json already configured");
	}
}

/** Every filename Astro will load a config from, in its own resolution order. */
const ASTRO_CONFIG_FILENAMES = [
	"astro.config.mjs",
	"astro.config.js",
	"astro.config.ts",
	"astro.config.mts",
	"astro.config.cjs",
];

const BACKUP_DIR = ".shirones-backup";

/** Move a file out of the way instead of deleting the user's work. */
async function backup(relativePath) {
	const from = join(CWD, relativePath);
	const to = join(CWD, BACKUP_DIR, relativePath);
	await mkdir(dirname(to), { recursive: true });
	await rename(from, to);
	return join(BACKUP_DIR, relativePath);
}

/**
 * Install the theme's `astro.config.mjs`.
 *
 * `pnpm create astro` always leaves a config behind, so "skip if it exists"
 * silently produced a project where the integration was never registered —
 * Astro then served its own starter page and the theme appeared to do nothing.
 * A config that does not mention the package is therefore replaced (the old one
 * is kept as a backup); a config that already wires the theme in is left alone.
 */
async function ensureAstroConfig(packageName, { force }) {
	const present = ASTRO_CONFIG_FILENAMES.filter((name) => existsSync(join(CWD, name)));
	const target = join(CWD, "astro.config.mjs");

	for (const name of present) {
		const current = await readFile(join(CWD, name), "utf8");
		const wired = current.includes(packageName) || current.includes("shirones");

		if (wired && !force) {
			log.skip(`${name} already wires the theme in`);
			return;
		}

		const saved = await backup(name);
		log.warn(`${name} did not register the theme — kept a copy at ${saved}`);
	}

	await cp(join(TEMPLATE_DIR, "astro.config.mjs"), target, { force: true });
	log.ok("astro.config.mjs");
}

/**
 * Get the starter files out of the way.
 *
 * Anything in `src/pages/` beats an injected route, so the starter
 * `index.astro` would keep serving Astro's welcome screen forever. Worse,
 * `src/layouts/Layout.astro` and `src/components/*` are exactly where the theme
 * looks for user overrides, so the starter versions would silently replace the
 * theme's own layout. None of it is content the user wrote, but we move rather
 * than delete.
 */
async function clearStarterFiles() {
	const suspects = [
		"src/pages/index.astro",
		"src/components/Welcome.astro",
		"src/layouts/Layout.astro",
		"src/assets/astro.svg",
		"src/assets/background.svg",
	];

	const moved = [];
	for (const relativePath of suspects) {
		const file = join(CWD, relativePath);
		if (!existsSync(file)) continue;

		if (relativePath.endsWith(".astro")) {
			const contents = await readFile(file, "utf8");
			const isStarter =
				contents.includes("Welcome") ||
				contents.includes("astro.build") ||
				contents.includes("<slot />");
			if (!isStarter) {
				log.warn(`${relativePath} is yours — left in place, but it overrides the theme`);
				continue;
			}
		}

		moved.push(await backup(relativePath));
	}

	if (moved.length > 0) {
		log.ok(`moved ${moved.length} starter files to ${BACKUP_DIR}/`);
	}

	// A `src/pages/` that still holds routes shadows the theme's own pages.
	const pagesDir = join(CWD, "src/pages");
	if (existsSync(pagesDir)) {
		const leftovers = (await readdir(pagesDir)).filter((name) => !name.startsWith("."));
		if (leftovers.length > 0) {
			log.warn(
				`src/pages/ still contains ${leftovers.join(", ")} — ` +
					"file routes win over the theme's injected routes",
			);
		}
	}
}

async function init(args) {
	const force = args.includes("--force") || args.includes("-f");
	const packageName = await readPackageName();

	if (!existsSync(TEMPLATE_DIR)) {
		log.err(
			`Template directory is missing from the installed package (${TEMPLATE_DIR}).\n` +
				"  This usually means the package was published incorrectly — please file an issue.",
		);
		process.exitCode = 1;
		return;
	}

	console.log(`\n${colours.bold}Shirone${colours.reset} · initialising project\n`);

	// 1. Content + configuration.
	await copyEntry(join(TEMPLATE_DIR, CONTENT_ROOT), join(CWD, CONTENT_ROOT), { force });

	// 2. Static assets (favicons, banners, demo images).
	await copyEntry(join(TEMPLATE_DIR, "public"), join(CWD, "public"), { force });

	// 3. Astro entry files.
	await copyEntry(
		join(TEMPLATE_DIR, "src/content.config.ts"),
		join(CWD, "src/content.config.ts"),
		{ force },
	);
	await ensureAstroConfig(packageName, { force });

	// 3b. Starter files from `pnpm create astro` shadow the theme.
	await clearStarterFiles();

	// 4. `astro-icon` scans this directory for local SVGs; creating it up front
	//    avoids a confusing ENOENT warning on the first build.
	await mkdir(join(CWD, "src/icons"), { recursive: true });

	// 5. Project metadata.
	await ensureTsConfig(packageName, { force });
	const addedPeers = await ensurePackageJsonScripts(packageName);
	await ensurePnpmWorkspace();

	const postCount = await countFiles(join(CWD, CONTENT_ROOT, "content/posts"));

	console.log(`
${colours.green}${colours.bold}Done.${colours.reset} ${postCount} example content files installed.

${colours.bold}Project layout${colours.reset}
  astro.config.mjs          the only Astro config
  src/content.config.ts     collection definitions
  src/components/           drop a file here to override a theme component
  src/layouts/              …same for layouts
  ${CONTENT_ROOT}/config/            site configuration (TypeScript, fully typed)
  ${CONTENT_ROOT}/config/data/       friends, projects, skills, timeline, …
  ${CONTENT_ROOT}/content/           posts, moments, about
  public/                   static assets

${colours.bold}Next${colours.reset}${
		addedPeers?.length
			? `\n  ${colours.yellow}pnpm install${colours.reset}  ${colours.dim}# ${addedPeers.length} dependencies were added${colours.reset}`
			: ""
	}
  ${colours.dim}pnpm dev${colours.reset}
`);
}

async function info() {
	const packageName = await readPackageName();
	const pagesDir = join(PACKAGE_ROOT, "src/pages");

	console.log(`\n${colours.bold}${packageName}${colours.reset}`);
	console.log(`  package root : ${PACKAGE_ROOT}`);
	console.log(`  template     : ${existsSync(TEMPLATE_DIR) ? "present" : colours.red + "MISSING" + colours.reset}`);
	console.log(`  project      : ${CWD}`);
	console.log(`  content dir  : ${join(CWD, CONTENT_ROOT)} ${existsSync(join(CWD, CONTENT_ROOT)) ? colours.green + "✓" + colours.reset : colours.yellow + "(not initialised)" + colours.reset}`);

	if (existsSync(pagesDir)) {
		const count = await countFiles(pagesDir);
		console.log(`  routes       : ${count} page modules`);
	}
	console.log();
}

function help() {
	console.log(`
${colours.bold}Shirone CLI${colours.reset}

  ${colours.cyan}init${colours.reset} [--force]   Scaffold configuration, content and static assets
  ${colours.cyan}info${colours.reset}             Show resolved paths and package status
  ${colours.cyan}help${colours.reset}             Show this message
`);
}

const [command = "help", ...args] = process.argv.slice(2);

switch (command) {
	case "init":
		await init(args);
		break;
	case "info":
		await info();
		break;
	case "help":
	case "--help":
	case "-h":
		help();
		break;
	default:
		log.err(`Unknown command: ${command}`);
		help();
		process.exitCode = 1;
}

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
import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
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
 * Peer dependencies that must sit at the *project* root.
 *
 * Vite resolves `optimizeDeps.include` from the project root, and
 * `@astrojs/svelte` registers a dozen `svelte/*` subpaths there. With pnpm's
 * strict layout a copy nested inside the theme package is invisible, so svelte
 * has to be a direct dependency of the user's project.
 */
const REQUIRED_PEERS = ["svelte"];

async function ensurePackageJsonScripts(packageName) {
	const pkgPath = join(CWD, "package.json");
	if (!existsSync(pkgPath)) return;

	const pkg = JSON.parse(await readFile(pkgPath, "utf8"));
	pkg.scripts ??= {};
	pkg.dependencies ??= {};
	let changed = false;

	const addedPeers = [];
	for (const peer of REQUIRED_PEERS) {
		if (pkg.dependencies[peer] || pkg.devDependencies?.[peer]) continue;
		const range = await peerRange(packageName, peer);
		if (!range) continue;
		pkg.dependencies[peer] = range;
		addedPeers.push(`${peer}@${range}`);
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

	// pnpm >= 10 refuses to silently skip a dependency's build script, and
	// `sharp` (image optimisation) needs its. Without this a fresh project
	// fails `pnpm install` with ERR_PNPM_IGNORED_BUILDS.
	const builtDeps = ["esbuild", "sharp"];
	pkg.pnpm ??= {};
	const existing = new Set(pkg.pnpm.onlyBuiltDependencies ?? []);
	if (builtDeps.some((dep) => !existing.has(dep))) {
		for (const dep of builtDeps) existing.add(dep);
		pkg.pnpm.onlyBuiltDependencies = [...existing].sort();
		changed = true;
	}

	if (changed) {
		await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
		log.ok("package.json");
	}
	return addedPeers;
}

/** Read a peer range straight out of the installed package. */
async function peerRange(packageName, peer) {
	try {
		const raw = await readFile(join(PACKAGE_ROOT, "package.json"), "utf8");
		return JSON.parse(raw).peerDependencies?.[peer] ?? null;
	} catch {
		return null;
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
	await copyEntry(
		join(TEMPLATE_DIR, "astro.config.mjs"),
		join(CWD, "astro.config.mjs"),
		{ force },
	);

	// 4. `astro-icon` scans this directory for local SVGs; creating it up front
	//    avoids a confusing ENOENT warning on the first build.
	await mkdir(join(CWD, "src/icons"), { recursive: true });

	// 5. Project metadata.
	await ensureTsConfig(packageName, { force });
	const addedPeers = await ensurePackageJsonScripts(packageName);

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
			? `\n  ${colours.yellow}pnpm install${colours.reset}  ${colours.dim}# added ${addedPeers.join(", ")}${colours.reset}`
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

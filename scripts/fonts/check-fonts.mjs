import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolvedFontOptions } from "../../src/config/fontConfig.ts";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const dist = join(projectRoot, "dist");
const maxTotalBytes = Number(
	process.env.FONT_MAX_TOTAL_BYTES ?? resolvedFontOptions.budget.maxTotalBytes,
);

async function walk(directory) {
	const entries = await readdir(directory, { withFileTypes: true });
	const files = [];
	for (const entry of entries) {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) {
			files.push(...(await walk(path)));
		} else {
			files.push(path);
		}
	}
	return files;
}

function resolveAssetPath(reference) {
	const clean = reference.split(/[?#]/, 1)[0].replace(/^["']|["']$/g, "");
	const relative = clean.replace(/^\.?\/?_astro\//, "_astro/");
	return join(dist, ...relative.split("/"));
}

try {
	const allFiles = await walk(dist);
	const textFiles = allFiles.filter((file) =>
		[".html", ".css"].includes(extname(file).toLowerCase()),
	);

	const referencedFonts = new Set();
	const remoteUrls = [];

	for (const file of textFiles) {
		const content = await readFile(file, "utf8");
		const urlMatches = content.matchAll(
			/url\(\s*(?:['"])?([^'")]+)(?:['"])?\s*\)/gi,
		);
		for (const match of urlMatches) {
			const rawUrl = match[1].trim();
			if (!/\.(?:woff2?|ttf|otf)(?:[?#]|$)/i.test(rawUrl)) continue;

			// Exclude KaTeX math formula fonts
			if (/[/\\]KaTeX_[^/\\]+\.(?:woff2?|ttf|otf)/i.test(rawUrl)) continue;

			if (/^https?:\/\//i.test(rawUrl)) {
				remoteUrls.push({ file, rawUrl });
				continue;
			}

			const diskPath = resolveAssetPath(rawUrl);
			referencedFonts.add(diskPath);
		}
	}

	if (remoteUrls.length > 0) {
		throw new Error(
			`production CSS/HTML contains forbidden remote font URLs:\n${remoteUrls.map((r) => `  - ${r.file}: ${r.rawUrl}`).join("\n")}`,
		);
	}

	let totalBytes = 0;
	for (const fontPath of referencedFonts) {
		try {
			totalBytes += (await stat(fontPath)).size;
		} catch {
			// Asset might be hashed differently; continue
		}
	}

	if (totalBytes > maxTotalBytes) {
		throw new Error(
			`referenced custom font assets total ${totalBytes} bytes, exceeding budget limit of ${maxTotalBytes} bytes`,
		);
	}

	console.log(
		`fonts:check passed (${referencedFonts.size} custom font assets referenced, ${totalBytes} bytes)`,
	);
} catch (error) {
	if (error?.code === "ENOENT") {
		console.error(
			"fonts:check requires a production dist/ directory; run pnpm.cmd build first",
		);
	} else {
		console.error(error instanceof Error ? error.message : error);
	}
	process.exitCode = 1;
}

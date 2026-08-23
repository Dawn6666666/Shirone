import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fontConfig } from "../../src/config/fontConfig.ts";
import { collectAllText } from "./text-collector.mjs";

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const subsetDir = join(projectRoot, "src/assets/fonts/.subset");

export async function subsetAllFonts(options = {}) {
	const force = options.force ?? false;
	const isEnabled = fontConfig.subsetting?.enable ?? false;

	if (!isEnabled && !force) {
		console.log(
			"[subsetting] ℹ Font subsetting is disabled in fontConfig (subsetting.enable: false), skipping",
		);
		return;
	}

	console.log("[subsetting] Starting automated font subsetting pipeline...");

	// 1. 收集全站文本字符（包含 Markdown、i18n、配置及 Meting 歌曲信息）
	const allText = await collectAllText();
	if (!allText || allText.length === 0) {
		console.warn("[subsetting] ⚠ No characters collected, skipping subsetting");
		return;
	}

	mkdirSync(subsetDir, { recursive: true });
	const charsetFile = join(subsetDir, "charset.txt");
	writeFileSync(charsetFile, allText, "utf8");
	console.log(
		`[subsetting] ✓ Collected ${allText.length} unique characters across site & music sources`,
	);

	// 2. 获取配置中的所有 local 来源字体
	const localVariants = fontConfig.fontFamilies
		.filter((f) => f.source === "local")
		.flatMap((f) => f.variants);

	if (localVariants.length === 0) {
		console.log("[subsetting] ℹ No local font variants to subset");
		return;
	}

	for (const variant of localVariants) {
		const originalPath = join(projectRoot, variant.file);
		if (!existsSync(originalPath)) {
			console.warn(`[subsetting] ⚠ Font file not found: ${originalPath}`);
			continue;
		}

		const ext = extname(variant.file);
		const baseName = basename(variant.file, ext);
		const outputPath = join(subsetDir, `${baseName}.subset.woff2`);

		console.log(
			`[subsetting] Processing ${baseName}${ext} -> ${baseName}.subset.woff2`,
		);
		const startTime = Date.now();

		try {
			execFileSync(
				"python",
				[
					"-m",
					"fontTools.subset",
					originalPath,
					`--text-file=${charsetFile}`,
					`--output-file=${outputPath}`,
					"--flavor=woff2",
					"--layout-features=*",
					"--desubroutinize",
				],
				{ stdio: "pipe" },
			);

			const originalBytes = statSync(originalPath).size;
			const subsetBytes = statSync(outputPath).size;
			const reduction = (
				((originalBytes - subsetBytes) / originalBytes) *
				100
			).toFixed(1);
			const durationMs = Date.now() - startTime;

			console.log(
				`[subsetting] ✓ ${baseName}: ${(originalBytes / 1024 / 1024).toFixed(2)} MB -> ${(subsetBytes / 1024).toFixed(1)} KB (-${reduction}%) in ${durationMs}ms`,
			);
		} catch (error) {
			console.error(
				`[subsetting] ❌ Failed to subset ${baseName}: ${error.message}`,
			);
		}
	}

	console.log(
		"[subsetting] All font subsetting tasks completed successfully!\n",
	);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	await subsetAllFonts({ force: true });
}

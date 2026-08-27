/**
 * 一次性迁移到 external 模式：把仓内内容导出成内容仓初始目录，并让代码仓不再跟踪这些路径。
 *
 * 只应在「自己的博客 fork」里执行一次。上游主题仓保持 local 模式与 demo 内容跟踪不变，
 * 主题使用者 clone 后的行为不受影响。
 *
 * 用法：
 *   node scripts/content/eject.mjs                    # 预演，只打印将要发生的改动
 *   node scripts/content/eject.mjs --yes               # 实际执行
 *   node scripts/content/eject.mjs --yes --out ../my-content
 */

import { execFileSync } from "node:child_process";
import {
	appendFileSync,
	copyFileSync,
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { MANIFEST_FILE, matchesAny, toPosix } from "./resolve-source.mjs";

const ROOT = process.cwd();

/**
 * 导出规则：`代码仓路径` -> `内容仓路径`。
 *
 * 只导出用户内容。主题自有资产（`src/assets/fonts/`、`public/favicon/`）
 * 与构建期生成物（缩略图、番剧封面、番剧快照）留在代码仓。
 */
const EXPORT_RULES = [
	{ repo: "src/content", content: "content" },
	{
		repo: "src/data",
		content: "data",
		exclude: ["src/data/anime-snapshots/**"],
	},
	{ repo: "src/assets/images", content: "assets/images" },
	{ repo: "public/images", content: "public/images" },
	{ repo: "public/assets/banner", content: "public/assets/banner" },
	{ repo: "public/assets/music", content: "public/assets/music" },
	{ repo: "public/assets/projects", content: "public/assets/projects" },
	{
		repo: "public/assets/anime",
		content: "public/assets/anime",
		exclude: ["public/assets/anime/covers/**"],
	},
];

/** eject 之后由内容仓接管、代码仓不再跟踪的路径。 */
const GITIGNORE_ENTRIES = [
	"/src/content/",
	"/src/data/*.ts",
	"/src/assets/images/",
	"/public/images/",
	"/public/assets/banner/",
	"/public/assets/music/",
	"/public/assets/projects/",
	"/public/assets/anime/*.webp",
];

const GITIGNORE_HEADER =
	"# content repository (materialized by `pnpm content:sync`)";

const args = process.argv.slice(2);
const options = {
	apply: args.includes("--yes"),
	force: args.includes("--force"),
	out: "../shirone-content",
};
const outIndex = args.indexOf("--out");
if (outIndex !== -1) {
	if (!args[outIndex + 1]) {
		console.error("[content] --out 需要一个目录参数。");
		process.exit(1);
	}
	options.out = args[outIndex + 1];
}

function log(message) {
	console.log(`[content] ${message}`);
}

function git(gitArgs) {
	return execFileSync("git", gitArgs, {
		cwd: ROOT,
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
	}).trim();
}

function collectFiles(directory, prefix = "", accumulator = []) {
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		if (entry.name === ".git") continue;
		const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
		if (entry.isDirectory()) {
			collectFiles(join(directory, entry.name), relativePath, accumulator);
		} else if (entry.isFile()) {
			accumulator.push(relativePath);
		}
	}
	return accumulator;
}

function assertCleanWorktree() {
	if (options.force) return;
	let status;
	try {
		status = git(["status", "--porcelain"]);
	} catch {
		throw new Error("当前目录不是 git 仓库，无法执行 eject。");
	}
	if (status !== "") {
		throw new Error(
			"工作区存在未提交改动。eject 会改写 .gitignore 与 git 索引，" +
				" 请先提交或暂存，或用 --force 跳过检查。",
		);
	}
}

function buildPlan() {
	const plan = [];
	for (const rule of EXPORT_RULES) {
		const absolute = join(ROOT, rule.repo);
		if (!existsSync(absolute) || !statSync(absolute).isDirectory()) continue;
		for (const relativePath of collectFiles(absolute)) {
			const repoRelative = `${rule.repo}/${relativePath}`;
			if (rule.exclude && matchesAny(repoRelative, rule.exclude)) continue;
			plan.push({
				from: repoRelative,
				to: `${rule.content}/${relativePath}`,
			});
		}
	}
	return plan;
}

function writeStarterFiles(outAbsolute, plan) {
	const postCount = plan.filter(
		(item) => item.to.startsWith("content/posts/") && item.to.endsWith(".md"),
	).length;

	writeFileSync(
		join(outAbsolute, "README.md"),
		[
			"# Shirone Content",
			"",
			"这是 Shirone 站点的内容仓库，只保存文章、说说、页面数据实体和用户图片。",
			"主题实现、依赖、构建与部署由代码仓库负责。",
			"",
			"## 目录边界",
			"",
			"| 内容仓库 | 代码仓库物化路径 |",
			"| --- | --- |",
			"| `content/` | `src/content/` |",
			"| `data/` | `src/data/` |",
			"| `assets/` | `src/assets/` |",
			"| `public/` | `public/` |",
			"",
			"`README.md`、`docs/` 和本仓库的 `.github/` 不会被物化，也不会触发站点重建。",
			"",
			"## 发布流程",
			"",
			"1. 在本仓库修改 `content/`、`data/`、`assets/` 或 `public/`；",
			"2. 提交并推送 `main` 分支；",
			"3. `.github/workflows/trigger-build.yml` 向代码仓发送 `content-updated` 事件；",
			"4. 代码仓 Actions 物化内容、构建并部署。",
			"",
			"## 本地预览",
			"",
			"在代码仓执行（PowerShell）：",
			"",
			"```powershell",
			'$env:CONTENT_DIR = "<本仓库的本地路径>"',
			"pnpm content:sync",
			"pnpm dev",
			"```",
			"",
			"边写边看时可以另开一个终端运行 `pnpm content:watch`。",
			"",
			`当前共 ${postCount} 篇文章。`,
			"",
		].join("\n"),
	);

	const workflowPath = join(
		outAbsolute,
		".github",
		"workflows",
		"trigger-build.yml",
	);
	mkdirSync(dirname(workflowPath), { recursive: true });
	writeFileSync(
		workflowPath,
		[
			"name: Trigger site build",
			"",
			"# 内容推送后通知代码仓重新构建。",
			"# 需要在本仓库配置 secrets.DISPATCH_TOKEN：",
			"# 一个只对代码仓授予 Contents: Read and write 的 fine-grained PAT。",
			"#",
			"# 想在合并前就校验内容，可再加一个调用代码仓",
			"# .github/workflows/content-validate.yml 的 workflow_call 作业。",
			"",
			"on:",
			"  push:",
			"    branches: [main]",
			"    paths:",
			'      - "content/**"',
			'      - "config/**"',
			'      - "data/**"',
			'      - "assets/**"',
			'      - "public/**"',
			'      - "shirone.content.json"',
			"  workflow_dispatch: {}",
			"",
			"concurrency:",
			"  group: trigger-build",
			"  cancel-in-progress: true",
			"",
			"jobs:",
			"  dispatch:",
			"    runs-on: ubuntu-latest",
			"    timeout-minutes: 5",
			"    steps:",
			"      - name: Notify code repository",
			"        uses: peter-evans/repository-dispatch@28959ce8df70de7be546dd1250a005dd32156697 # v4.0.1",
			"        with:",
			// biome-ignore lint/suspicious/noTemplateCurlyInString: GitHub Actions 表达式，不是 JS 模板占位符
			"          token: ${{ secrets.DISPATCH_TOKEN }}",
			"          repository: OWNER/REPO # TODO: 替换为代码仓",
			"          event-type: content-updated",
			"          # 传 SHA 让代码仓构建「触发它的那次提交」，而不是构建时刻的 main。",
			// biome-ignore lint/suspicious/noTemplateCurlyInString: GitHub Actions 表达式，不是 JS 模板占位符
			'          client-payload: \'{"sha": "${{ github.sha }}"}\'',
			"",
		].join("\n"),
	);

	writeFileSync(
		join(outAbsolute, ".gitignore"),
		["node_modules/", ".DS_Store", "Thumbs.db", ""].join("\n"),
	);
}

function updateGitignore() {
	const gitignorePath = join(ROOT, ".gitignore");
	const current = existsSync(gitignorePath)
		? readFileSync(gitignorePath, "utf8")
		: "";
	const existing = new Set(current.split(/\r?\n/).map((line) => line.trim()));
	const missing = GITIGNORE_ENTRIES.filter((entry) => !existing.has(entry));
	if (missing.length === 0) return [];

	const block = `\n${GITIGNORE_HEADER}\n${missing.join("\n")}\n`;
	if (options.apply) appendFileSync(gitignorePath, block);
	return missing;
}

function untrackPaths() {
	const pathspecs = [
		"src/content",
		"src/data/*.ts",
		"src/assets/images",
		"public/images",
		"public/assets/banner",
		"public/assets/music",
		"public/assets/projects",
		"public/assets/anime/*.webp",
	];
	if (!options.apply) return pathspecs;
	for (const pathspec of pathspecs) {
		git(["rm", "-r", "--cached", "--quiet", "--ignore-unmatch", pathspec]);
	}
	return pathspecs;
}

function writeManifest(outAbsolute) {
	const manifestPath = join(ROOT, MANIFEST_FILE);
	if (existsSync(manifestPath) && !options.force) {
		log(`${MANIFEST_FILE} 已存在，保持不变（需要覆盖请加 --force）。`);
		return;
	}
	const relativeOut = toPosix(relative(ROOT, outAbsolute)) || ".";
	const manifest = {
		schemaVersion: 1,
		source: { type: "path", path: relativeOut },
	};
	if (options.apply) {
		writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
	}
	log(
		`写入 ${MANIFEST_FILE}，内容源指向 ${relativeOut}。` +
			' 内容仓推到远端后，把 source 改成 { "type": "git", "url": ..., "ref": "main" }。',
	);
}

function main() {
	assertCleanWorktree();

	const outAbsolute = resolve(ROOT, options.out);
	if (
		existsSync(outAbsolute) &&
		readdirSync(outAbsolute).length > 0 &&
		!options.force
	) {
		throw new Error(
			`导出目录 ${outAbsolute} 非空。请换一个 --out 目录，或加 --force。`,
		);
	}

	const plan = buildPlan();
	if (plan.length === 0) {
		throw new Error("没有找到可导出的内容，仓库可能已经 eject 过了。");
	}

	log(
		`${options.apply ? "" : "[预演] "}导出 ${plan.length} 个文件到 ${outAbsolute}`,
	);
	if (options.apply) {
		for (const item of plan) {
			const target = join(outAbsolute, item.to);
			mkdirSync(dirname(target), { recursive: true });
			copyFileSync(join(ROOT, item.from), target);
		}
		writeStarterFiles(outAbsolute, plan);
	}

	const ignored = updateGitignore();
	if (ignored.length > 0) {
		log(
			`${options.apply ? "追加" : "[预演] 将追加"} ${ignored.length} 条 .gitignore 规则`,
		);
	}

	const untracked = untrackPaths();
	log(
		`${options.apply ? "已从 git 索引移除" : "[预演] 将从 git 索引移除"}：${untracked.join(", ")}`,
	);

	writeManifest(outAbsolute);

	if (!options.apply) {
		log("以上均为预演。确认无误后重新运行并加上 --yes。");
		return;
	}

	log("完成。后续步骤：");
	log(
		`  1. cd ${outAbsolute} && git init && git add . && git commit -m "chore: initial content"`,
	);
	log("  2. 把内容仓推到远端，并在其中配置 secrets.DISPATCH_TOKEN");
	log(
		"  3. 在代码仓复制 .github/workflows/deploy.example.yml 为 deploy.yml 并补全部署步骤",
	);
	log("  4. 在代码仓提交 .gitignore、shirone.content.json 与索引变更");
}

try {
	main();
} catch (error) {
	console.error(`[content] ${error.message}`);
	process.exitCode = 1;
}

import { expect, test } from "@playwright/test";

const GITHUB_MOCK = {
	description: "A static blog template built with Astro.",
	language: "TypeScript",
	stargazers_count: 4860,
	forks: 1243,
	owner: {
		avatar_url:
			"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><rect width='24' height='24' rx='12' fill='%236366f1'/></svg>",
	},
	license: { spdx_id: "MIT" },
};

test.describe("MDX Support and M3E Integration", () => {
	test.use({ viewport: { width: 1280, height: 900 } });

	test.beforeEach(async ({ page }) => {
		await page.route("https://api.github.com/**", (route) =>
			route.fulfill({
				status: 200,
				contentType: "application/json",
				body: JSON.stringify(GITHUB_MOCK),
			}),
		);
	});

	test("direct navigation renders MDX article with metadata, TOC and M3E components", async ({
		page,
	}) => {
		await page.goto("/posts/mdx-showcase/", { waitUntil: "networkidle" });
		await page.waitForTimeout(600);

		// 验证标题与元数据
		const title = page.locator("#post-container [data-pagefind-meta='title']");
		await expect(title).toContainText(
			"MDX Integration and M3E Atomic Components",
		);

		// 验证 M3E 展示型组件（纯 SSR 输出）
		const filledCards = page.locator(".m3-card.m3-card--filled");
		await expect(filledCards.first()).toBeVisible();

		const accentBars = page.locator(".m3-accent-bar");
		await expect(accentBars.first()).toBeVisible();

		const badges = page.locator(".m3-badge");
		await expect(badges.first()).toBeVisible();

		const skeletons = page.locator(".m3-skeleton");
		await expect(skeletons.first()).toBeVisible();

		// 验证 Svelte 5 客户端水合岛（交互型与反馈原子）
		const buttons = page.locator(".m3-button");
		await expect(buttons.first()).toBeVisible();

		const loadingIndicators = page.locator(".m3-loading");
		await expect(loadingIndicators.first()).toBeVisible();

		const chips = page.locator(".m3-chip");
		await expect(chips.first()).toBeVisible();

		const segmentedButtons = page.locator(".m3-segmented");
		await expect(segmentedButtons.first()).toBeVisible();

		const checkboxes = page.locator(".m3-checkbox");
		await expect(checkboxes.first()).toBeVisible();

		const textFields = page.locator(".m3-text-field");
		await expect(textFields.first()).toBeVisible();

		const switchInput = page
			.locator("#post-container .m3-switch__input")
			.first();
		await switchInput.scrollIntoViewIfNeeded();
		await page.waitForTimeout(300);
		await expect(switchInput).toBeVisible();
		await expect(switchInput).toBeChecked();

		// 测试开关交互
		await switchInput.click({ force: true });
		await expect(switchInput).not.toBeChecked();

		// 验证进度指示器
		const progress = page.locator(".m3-progress");
		await expect(progress.first()).toBeVisible();

		// 验证 Markdown 扩展指令（Admonition, KaTeX）
		const admonition = page.locator(".admonition");
		await expect(admonition.first()).toBeVisible();

		const katex = page.locator(".katex");
		await expect(katex.first()).toBeVisible();

		const mermaid = page.locator(".markdown-mermaid");
		await expect(mermaid).toHaveAttribute("data-mermaid-state", "ready", {
			timeout: 10_000,
		});
		await expect(mermaid.locator("[data-mermaid-svg]")).toHaveCount(1);
	});

	test("Swup client-side navigation smoothly loads MDX post and hydrates islands", async ({
		page,
	}) => {
		await page.goto("/", { waitUntil: "networkidle" });
		await page.waitForTimeout(500);

		// 点击跳转到 MDX 演示文章
		const mdxPostLink = page.locator('a[href*="/posts/mdx-showcase/"]').first();
		await expect(mdxPostLink).toBeVisible();
		await mdxPostLink.click();

		// 等待 Swup 页面过渡完成并进入文章页
		await expect(page).toHaveURL(/\/posts\/mdx-showcase\/?/);
		await page.waitForTimeout(600);

		// 验证文章正文与水合状态
		const switchInput = page
			.locator("#post-container .m3-switch__input")
			.first();
		await switchInput.scrollIntoViewIfNeeded();
		await page.waitForTimeout(400);
		await expect(switchInput).toBeVisible();
		await expect(switchInput).toBeChecked();

		await switchInput.click({ force: true });
		await expect(switchInput).not.toBeChecked();
	});

	test("RSS feed contains cleaned MDX content without raw exports or JSX leaks", async ({
		page,
	}) => {
		const response = await page.goto("/rss.xml");
		expect(response?.status()).toBe(200);

		const text = await response?.text();
		expect(text).toContain(
			"<title>MDX Integration and M3E Atomic Components</title>",
		);
		// 确保不包含裸露的 export 声明和 import 语句
		expect(text).not.toContain("export const authorInfo");
		expect(text).not.toContain('import Button from "@components');
	});
});

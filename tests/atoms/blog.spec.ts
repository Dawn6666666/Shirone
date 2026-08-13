import { expect, test } from "@playwright/test";
import { openTestPage, expectMatchesToken, readStyle } from "../helpers/atoms";

/**
 * blog 分类原子官方对照：
 * - PostCard：Card token（surface-container-high + corner-large）+ 封面 + 元信息
 * - PostMeta：日期/分类/标签链接，on-surface-variant
 * - TagList / CategoryList：Chip / Button 复用，数量徽标
 * - TocList：层级编号/圆点与锚点
 * - PagePagination：页码窗口 + 省略号 + 激活页 primary + 单页禁用箭头
 * - ArchiveList：年份分组 + 时间轴节点（primary 环）
 * - FooterBar：版权 + primary 链接
 */
test.describe("blog/PostCard", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-blog-test");
	});

	test("卡片 token：card-bg（站点卡片色）+ corner-large + 链接语义", async ({ page }) => {
		const card = page.locator(".m3-blog-postcard").first();
		await expectMatchesToken(
			page,
			".m3-blog-postcard",
			"background-color",
			"--card-bg",
		);
		expect(await readStyle(page, ".m3-blog-postcard", "border-radius")).toBe("16px");
		await expect(card).toContainText("M3E 波浪进度条实现笔记");
		await expect(card).toContainText("5 分钟");
		await expect(card.locator('a[href="/posts/demo-1/"]')).toHaveCount(2); // 标题 + 进入按钮
	});

	test("有封面时渲染封面图并带 alt", async ({ page }) => {
		const card = page.locator(".m3-blog-postcard").nth(1);
		const img = card.locator("img");
		await expect(img).toBeVisible();
		await expect(img).toHaveAttribute("alt", "示例封面");
		// 封面加载占位（Skeleton）渲染在 img 之下
		await expect(
			card.locator(".m3-blog-postcard__cover-skeleton"),
		).toHaveCount(1);
	});

	test("封面触摸箭头默认隐藏，hover 时显示", async ({ page }) => {
		const card = page.locator(".m3-blog-postcard").nth(1);
		const arrow = card.locator(".m3-blog-postcard__cover-arrow");
		await expect(arrow).toHaveCSS("opacity", "0");
		await card.hover();
		await expect(arrow).toHaveCSS("opacity", "1");
	});

	test("标题左侧 AccentBar 竖线（primary 强调）", async ({ page }) => {
		const bar = page.locator(".m3-blog-postcard__title .m3-accent-bar").first();
		await expect(bar).toBeVisible();
		await expectMatchesToken(
			page,
			".m3-blog-postcard__title .m3-accent-bar",
			"background-color",
			"--primary",
		);
		expect(Math.round((await bar.boundingBox())?.width ?? 0)).toBe(4);
	});
});

test.describe("blog/PostMeta", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-blog-test");
	});

	test("渲染日期/分类/标签链接，on-surface-variant", async ({ page }) => {
		const meta = page.locator(".m3-blog-postmeta").first();
		await expect(meta).toContainText("2026-08-13");
		await expect(meta.locator("a")).toHaveCount(4); // 1 category + 3 tags
		await expect(meta.locator("a").first()).toHaveAttribute(
			"href",
			"/category/theme/",
		);
		await expectMatchesToken(page, ".m3-blog-postmeta", "color", "--on-surface-variant");
	});

	test("无分类/无标签时显示占位文案", async ({ page }) => {
		const meta = page.locator(".m3-blog-postmeta").last();
		await expect(meta).toContainText("未分类");
		await expect(meta).toContainText("无标签");
	});
});

test.describe("blog/TagList + CategoryList", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-blog-test");
	});

	test("TagList 渲染 tonal Chip 链接", async ({ page }) => {
		const chips = page.locator(".m3-blog-taglist .m3-chip");
		await expect(chips).toHaveCount(3);
		await expect(chips.first()).toHaveAttribute("href", "/tags/m3e/");
		await expect(chips.first()).toContainText("M3E");
	});

	test("CategoryList 渲染链接与数量徽标", async ({ page }) => {
		const items = page.locator(".m3-blog-categorylist .m3-button");
		await expect(items).toHaveCount(3);
		await expect(items.first()).toHaveAttribute("href", "/category/theme/");
		await expect(items.first()).toContainText("12");
		await expectMatchesToken(
			page,
			".m3-blog-categorylist__badge",
			"background-color",
			"--surface-container-high",
		);
	});

	test("CategoryList 暗色模式下徽标用 primary 实底（可读性）", async ({ page }) => {
		await page.addInitScript(() => localStorage.setItem("theme", "dark"));
		await openTestPage(page, "atoms-blog-test");
		await expectMatchesToken(
			page,
			".m3-blog-categorylist__badge",
			"background-color",
			"--primary",
		);
	});
});

test.describe("blog/TocList", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-blog-test");
	});

	test("渲染锚点与层级编号/圆点", async ({ page }) => {
		const toc = page.locator(".m3-blog-toc");
		await expect(toc.locator("a")).toHaveCount(7);
		await expect(toc.locator("a").first()).toHaveAttribute("href", "#getting-started");
		await expect(toc.locator(".m3-blog-toc__mark").first()).toContainText("1");
		await expect(toc.locator(".m3-blog-toc__dot").first()).toBeVisible();
		await expectMatchesToken(
			page,
			".m3-blog-toc__mark",
			"background-color",
			"--secondary-container",
		);
	});
});

test.describe("blog/PagePagination", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-blog-test");
	});

	test("页码窗口 + 省略号 + 激活页 primary", async ({ page }) => {
		const pag = page.locator(".m3-blog-pagination").first();
		const active = pag.locator(".m3-blog-pagination__num--active");
		await expect(active).toContainText("3");
		await expect(active).toHaveAttribute("aria-current", "page");
		await expectMatchesToken(
			page,
			".m3-blog-pagination__num--active",
			"background-color",
			"--primary",
		);
		// 第 3/12 页：窗口 [1..5] + … + 12，仅尾部一个省略号
		await expect(pag.locator(".m3-blog-pagination__ellipsis")).toHaveCount(1);
		await expect(pag.locator(".m3-blog-pagination__num")).toHaveCount(6);
		await expect(pag.locator(".m3-blog-pagination__arrow").first()).toHaveAttribute(
			"href",
			"/page/2/",
		);
		await expect(pag.locator(".m3-blog-pagination__arrow").nth(1)).toHaveAttribute(
			"href",
			"/page/4/",
		);
	});

	test("中间页窗口：首尾省略号 + 页码折叠", async ({ page }) => {
		const mid = page.locator(".m3-blog-pagination").nth(1); // 第 6/12 页
		await expect(mid.locator(".m3-blog-pagination__ellipsis")).toHaveCount(2);
		await expect(mid.locator(".m3-blog-pagination__num--active")).toContainText("6");
		await expect(mid.locator(".m3-blog-pagination__num")).toHaveCount(7); // 1 … 4 5 6 7 8 … 12
	});

	test("单页时前后箭头禁用", async ({ page }) => {
		const single = page.locator(".m3-blog-pagination").nth(2);
		await expect(single.locator(".m3-blog-pagination__arrow--disabled")).toHaveCount(2);
	});
});

test.describe("blog/ArchiveList", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-blog-test");
	});

	test("年份分组 + 节点环 + 条目链接", async ({ page }) => {
		const archive = page.locator(".m3-blog-archive");
		await expect(archive.locator(".m3-blog-archive__year")).toHaveCount(2);
		await expect(archive.locator(".m3-blog-archive__year").first()).toContainText("2026");
		await expect(archive.locator(".m3-blog-archive__item")).toHaveCount(4);
		await expect(archive.locator(".m3-blog-archive__item").first()).toHaveAttribute(
			"href",
			"/posts/wavy/",
		);
		await expectMatchesToken(
			page,
			".m3-blog-archive__dot",
			"border-top-color",
			"--primary",
		);
	});
});

test.describe("blog/SearchPanel", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-blog-test");
	});

	test("渲染结果项、mark 高亮与移动端输入", async ({ page }) => {
		const panel = page.locator(".m3-blog-searchpanel").first();
		await expect(panel).toBeVisible();
		await expect(panel.locator(".m3-blog-searchpanel__item")).toHaveCount(2);
		await expect(panel.locator(".m3-blog-searchpanel__title").first()).toContainText(
			"M3E 波浪进度条实现笔记",
		);
		await expect(panel.locator(".m3-blog-searchpanel__excerpt mark").first()).toContainText(
			"波浪进度条",
		);
		await expect(panel.locator(".m3-blog-searchpanel__input")).toBeVisible();
		await expectMatchesToken(
			page,
			".m3-blog-searchpanel",
			"background-color",
			"--float-panel-bg",
		);
	});

	test("hideInputOnDesktop：桌面隐藏、移动端显示面板内输入", async ({ page }) => {
		const panel = page.locator(".m3-blog-searchpanel").nth(1);
		await expect(panel.locator(".m3-blog-searchpanel__input")).toBeHidden();
		await page.setViewportSize({ width: 390, height: 844 });
		await expect(panel.locator(".m3-blog-searchpanel__input")).toBeVisible();
	});
});

test.describe("blog/FooterBar", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-blog-test");
	});

	test("版权文本 + primary 链接", async ({ page }) => {
		const footer = page.locator(".m3-blog-footer");
		await expect(footer).toContainText("Shirone. All Rights Reserved.");
		await expect(footer.locator("a").first()).toHaveAttribute("href", "/rss.xml");
		await expectMatchesToken(page, ".m3-blog-footer__link", "color", "--primary");
	});
});

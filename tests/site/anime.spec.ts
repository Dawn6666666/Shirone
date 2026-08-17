import { expect, test } from "@playwright/test";

/**
 * 番剧页功能锁定（pages/anime.astro -> organisms/AnimeSection.svelte，client:only）。
 * 交互语言与友链/动态页同构：PageHeader 页内大标题（装饰图标）、
 * 官方 Chips 状态筛选原子（单选、再点取消）、筛选状态 URL 同步（?status=）、
 * LoadingIndicator 三段过渡、加载更多按钮。
 * 布局形态跟随全局文章列表偏好（localStorage `post-list-mode`，DisplaySettings
 * 切换广播 post-list-layout-change 事件）：grid 海报网格 / list 横向卡。
 * 数据来自 src/data/anime.ts（经 utils/anime-data.getAnimeList 稳定顺序），
 * 断言基于 Mizuki 迁移数据集（5 条：watching×3/completed/planned，带真实封面与
 * Bilibili 外链）；站点默认语言为 en（siteConfig.lang），文案断言用英文。
 */

const ANIME_COUNT = 5;

test.describe("番剧页", () => {
	test.beforeEach(async ({ page }) => {
		// 卡片级断言跑在确定布局下：预置 grid 偏好（默认 list 见专项用例）
		await page.addInitScript(() =>
			localStorage.setItem("post-list-mode", "grid"),
		);
		await page.goto("/anime/");
		await expect(page.locator(".anime-card")).toHaveCount(ANIME_COUNT);
	});

	test("渲染番剧卡片（状态 pill / 评分 / 真实封面 / 进度条）", async ({ page }) => {
		const first = page.locator(".anime-card").first();
		await expect(first).toHaveAttribute("data-status", "completed");
		await expect(first.locator(".anime-card__title")).toHaveText("Lycoris Recoil");
		// 状态 tonal pill（i18n 文案 + 语义色注入）
		await expect(first.locator(".anime-card__status")).toHaveText("Completed");
		await expect(first.locator(".anime-card__status")).toHaveCSS(
			"color",
			/rgb\(|var\(--tertiary\)/,
		);
		// 评分 scrim pill（封面右上，star + 数字）
		await expect(first.locator(".anime-card__rating")).toContainText("9.8");
		// Mizuki 迁移数据带真实封面与 Bilibili 外链：封面 img + 可点 <a> + 悬停播放层
		await expect(first.locator(".anime-card__cover-img")).toHaveCount(1);
		await expect(first.locator("a.anime-card__cover")).toHaveCount(1);
		await expect(first.locator("a.anime-card__cover")).toHaveAttribute(
			"href",
			/https:\/\/www\.bilibili\.com\/bangumi\/media\/md28338623/,
		);
		await expect(first.locator(".anime-card__play")).toHaveCount(1);
		// completed 卡不渲染进度条；watching 卡渲染 determinate 进度 + watched/total
		await expect(first.locator(".m3-progress--linear")).toHaveCount(0);
		const watching = page.locator(".anime-card").nth(1);
		await expect(watching.locator(".anime-card__title")).toHaveText("Yowamushi Pedal");
		await expect(watching.locator(".m3-progress--linear")).toHaveCount(1);
		await expect(watching.locator(".anime-card__progress-text")).toHaveText("8/12");
		// 元信息行与题材弱标签
		await expect(first.locator(".anime-card__meta")).toHaveText("2022 · A-1 Pictures");
		await expect(first.locator(".anime-card__genre").first()).toHaveText("#Action");
	});

	test("页头与站点统一视觉结构（PageHeader + 状态筛选 chips）", async ({ page }) => {
		await expect(page.locator(".page-header")).toHaveCount(1);
		await expect(page.locator(".page-header__title")).toHaveText("Anime");
		await expect(page.locator(".page-header__icon svg")).toHaveCount(1);
		// 官方 Chips 原子（filter 形态 + 状态前置图标），只列数据中出现的状态
		const chips = page.locator(".anime-section__chips .m3-chip--filter");
		await expect(chips).toHaveCount(3);
		await expect(page.locator(".anime-section__count")).toHaveText("5 anime");
	});

	test("单选状态筛选（再点取消恢复全部，aria-pressed 同步 + URL ?status=）", async ({
		page,
	}) => {
		const watchingChip = page.getByRole("button", { name: "Watching", exact: true });
		await watchingChip.click();
		await expect(watchingChip).toHaveAttribute("aria-pressed", "true");
		await expect(page).toHaveURL(/[?&]status=watching/);
		await expect(page.locator(".anime-card")).toHaveCount(3);
		await expect(page.locator(".anime-section__count")).toHaveText("3 anime");
		await watchingChip.click();
		await expect(watchingChip).toHaveAttribute("aria-pressed", "false");
		await expect(page.locator(".anime-card")).toHaveCount(ANIME_COUNT);
		// 取消筛选后 URL 参数移除
		await expect(page).not.toHaveURL(/status=/);
	});

	test("深链恢复筛选（?status=completed）与空态", async ({ page }) => {
		await page.goto("/anime/?status=completed");
		const completedChip = page.getByRole("button", { name: "Completed", exact: true });
		await expect(completedChip).toHaveAttribute("aria-pressed", "true");
		await expect(page.locator(".anime-card")).toHaveCount(1);
		await expect(page.locator(".anime-card__title")).toHaveText("Lycoris Recoil");
		// 未知状态值 → 空态文案
		await page.goto("/anime/?status=nonsense");
		await expect(page.locator(".anime-section__empty")).toBeVisible();
		await expect(page.locator(".anime-section__empty")).toContainText(
			"No anime matched your filter",
		);
	});

	test("状态筛选切换播放 LoadingIndicator 过渡后揭幕", async ({ page }) => {
		await page.getByRole("button", { name: "Planned", exact: true }).click();
		// 三段过渡的指示器阶段（contained LoadingIndicator 出现在内容区）
		await expect(page.locator(".anime-section__loading .m3-loading--contained")).toBeVisible();
		// 过渡收敛后只剩 planned 一张卡
		await expect(page.locator(".anime-card")).toHaveCount(1);
		await expect(page.locator(".anime-card__title")).toHaveText("Is the Order a Rabbit?");
		await expect(page.locator(".anime-section__loading")).toHaveCount(0);
	});

	test("grid 布局：海报网格按容器宽度分档列数", async ({ page }) => {
		await expect(page.locator(".anime-list")).toHaveClass(/anime-list--grid/);
		// 主栏受侧栏挤压（1280 视口下内容宽 ≈ 500-600px → 3 列档），列数 ≥ 2
		const columns = await page
			.locator(".anime-list")
			.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
		expect(columns).toBeGreaterThanOrEqual(2);
	});

	test("侧栏 widget 在番剧页照常渲染（pages 过滤对齐 friends/moments）", async ({
		page,
	}) => {
		await expect(page.locator('widget-layout[data-id="categories"]')).toBeVisible();
		await expect(page.locator('widget-layout[data-id="tags"]')).toBeVisible();
	});
});

/* 布局形态跟随全局偏好：以下用例用干净存储（无 grid 预置），验证默认值 / list 形态 / 设置面板广播 */
test.describe("番剧页布局（全局 list/grid 偏好）", () => {
	test("list 布局：横向卡片（封面固定宽 + 正文铺开）", async ({ page }) => {
		await page.addInitScript(() =>
			localStorage.setItem("post-list-mode", "list"),
		);
		await page.goto("/anime/");
		await expect(page.locator(".anime-card")).toHaveCount(ANIME_COUNT);
		await expect(page.locator(".anime-list")).toHaveClass(/anime-list--list/);
		const first = page.locator(".anime-card").first();
		await expect(first).toHaveCSS("flex-direction", "row");
		// 1280 视口 ≥ 768px 断点 → 11rem 封面（8.5rem 为小屏档）
		await expect(first.locator(".anime-card__cover")).toHaveCSS("width", "176px");
		// 正文铺开：标题/描述/进度在同一横排右侧
		await expect(first.locator(".anime-card__body")).toHaveCSS(
			"justify-content",
			"space-between",
		);
	});

	test("默认布局跟随站点偏好（无存储 = postListConfig 默认 list）", async ({
		page,
	}) => {
		await page.goto("/anime/");
		await expect(page.locator(".anime-card")).toHaveCount(ANIME_COUNT);
		await expect(page.locator(".anime-list")).toHaveClass(/anime-list--list/);
	});

	test("设置面板切换 list/grid 广播到番剧页（偏好写入 localStorage）", async ({
		page,
	}) => {
		await page.goto("/anime/");
		await expect(page.locator(".anime-list")).toHaveClass(/anime-list--list/);
		await page.locator("#display-settings-switch").click();
		const gridLabel = page.locator("#display-setting").getByText("Grid");
		await gridLabel.waitFor({ state: "visible", timeout: 10_000 });
		await gridLabel.click();
		await expect(page.locator(".anime-list")).toHaveClass(/anime-list--grid/);
		expect(
			await page.evaluate(() => localStorage.getItem("post-list-mode")),
		).toBe("grid");
	});
});

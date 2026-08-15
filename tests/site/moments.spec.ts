import { expect, test } from "@playwright/test";

/**
 * 动态页功能锁定（pages/moments.astro -> organisms/MomentSection.svelte，client:only）。
 * 视觉约束对齐站点设计语言：PageHeader 页内大标题、胶囊搜索条、官方 Chips 筛选、
 * MomentCard（<article> 语义 + 置顶/心情徽标 + 自适应图片网格 +N 折叠 + Fancybox 灯箱）、
 * 筛选状态 URL 同步（?q= / ?tag=）。
 * 数据来自 src/content/moments/（getSortedMoments：置顶优先 + 时间倒序），
 * 断言基于默认示例数据集；站点默认语言为 en（siteConfig.lang），UI 文案断言用英文、
 * 内容断言跟随示例 markdown（中文）。
 */

const MOMENT_COUNT = 6;

test.describe("动态页", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/moments/");
		await expect(page.locator(".moment-card")).toHaveCount(MOMENT_COUNT);
	});

	test("渲染动态卡片（置顶优先 + 作者 + 时间 + 徽标）", async ({ page }) => {
		const first = page.locator(".moment-card").first();
		// 置顶条目排最前，带置顶徽标与心情图标
		await expect(first.locator(".moment-card__badge--pinned")).toHaveText("Pinned");
		await expect(first.locator(".moment-card__badge:not(.moment-card__badge--pinned) svg")).toHaveCount(1);
		// 作者区（头像 + 名字）链到关于页
		await expect(first.locator(".moment-card__author")).toHaveAttribute("href", "/about/");
		await expect(first.locator(".moment-card__name")).toHaveText("Shirone");
		// 时间为 <time datetime>，倒序排列
		await expect(first.locator("time.moment-card__time")).toHaveAttribute(
			"datetime",
			/2026-08-15/,
		);
		const times = await page.locator(".moment-card__time").allTextContents();
		expect(times.length).toBe(MOMENT_COUNT);
		// 正文为构建期渲染的 markdown
		await expect(first.locator(".moment-card__content")).toContainText("Welcome to Moments");
	});

	test("自适应图片网格（单图 / 2×2 / 三图拼图 / 三列 +N 折叠，灯箱分组）", async ({ page }) => {
		// 3 图 → 「1 大 + 2 小」拼图（大图跨两行，无 2+1 孤儿行）
		const mosaic = page.locator(".moment-card__gallery--mosaic");
		await expect(mosaic).toHaveCount(1);
		await expect(mosaic.locator(".moment-card__tile")).toHaveCount(3);
		await expect(mosaic.locator(".moment-card__tile--hero")).toHaveCount(1);
		// 4 图 → 2×2 双列网格
		const pair = page.locator(".moment-card__gallery--pair");
		await expect(pair).toHaveCount(1);
		await expect(pair.locator(".moment-card__tile")).toHaveCount(4);
		// 1 图 → 单图自然尺寸
		await expect(page.locator(".moment-card__gallery--single .moment-card__tile")).toHaveCount(1);
		// 7 图 → 三列封顶 6 块 + 「+1」折叠遮罩
		const trio = page.locator(".moment-card__gallery--trio");
		await expect(trio.locator(".moment-card__tile")).toHaveCount(6);
		await expect(trio.locator(".moment-card__more")).toHaveText("+1");
		// 灯箱按条目分组（data-fancybox）
		const group = await trio
			.locator("img[data-fancybox]")
			.first()
			.getAttribute("data-fancybox");
		expect(group).toMatch(/^moments-/);
	});

	test("点击图片打开 Fancybox 灯箱", async ({ page }) => {
		await page.locator(".moment-card__tile img").first().click();
		const lightbox = page.locator(".fancybox__container");
		await expect(lightbox).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(lightbox).toHaveCount(0);
	});

	test("使用站点统一的页面视觉结构", async ({ page }) => {
		await expect(page.locator(".page-header")).toHaveCount(1);
		await expect(page.locator(".page-header__title")).toHaveText("Moments");
		await expect(page.locator(".page-header__icon svg")).toHaveCount(1);
		// 官方 Chips 原子（filter 形态）承担标签筛选
		await expect(page.locator(".moment-section__chips .m3-chip--filter")).toHaveCount(6);
		// 计数文案（复数形态）
		await expect(page.locator(".moment-section__count")).toHaveText("6 moments");
		// 位置与 #标签 弱文本（At my desk = 整理壁纸库那条）
		await expect(page.locator(".moment-card__location").first()).toContainText("At my desk");
		expect(await page.locator(".moment-card__tag").count()).toBeGreaterThan(0);
	});

	test("筛选状态同步到 URL（?q= / ?tag=）", async ({ page }) => {
		await page.locator(".moment-section__search input").fill("scenery");
		await expect(page).toHaveURL(/[?&]q=/);
		expect(new URL(page.url()).searchParams.get("q")).toBe("scenery");
		await page.getByRole("button", { name: "wallpaper", exact: true }).click();
		await expect(page).toHaveURL(/[?&]tag=/);
		expect(new URL(page.url()).searchParams.get("tag")).toBe("wallpaper");
		await page.locator(".moment-section__search input").fill("");
		await expect(page).toHaveURL(/[?&]tag=/);
	});

	test("单选标签筛选（再点取消恢复全部，aria-pressed 同步）", async ({ page }) => {
		const tagFilter = page.getByRole("button", { name: "wallpaper", exact: true });
		await tagFilter.click();
		await expect(tagFilter).toHaveAttribute("aria-pressed", "true");
		// 三篇带「wallpaper」标签：三张少女、七张少女、风景四张
		await expect(page.locator(".moment-card")).toHaveCount(3);
		await expect(page.locator(".moment-card").first()).toContainText("Three new wallpapers");
		await tagFilter.click();
		await expect(page.locator(".moment-card")).toHaveCount(MOMENT_COUNT);
		await expect(tagFilter).toHaveAttribute("aria-pressed", "false");
	});

	test("搜索过滤 + 空态", async ({ page }) => {
		await page.locator(".moment-section__search input").fill("scenery");
		await expect(page.locator(".moment-card")).toHaveCount(1);
		await page.locator(".moment-section__search input").fill("no such moment");
		await expect(page.locator(".moment-section__empty")).toBeVisible();
		await expect(page.locator(".moment-section__empty")).toContainText(
			"No moments matched your filters",
		);
	});
});

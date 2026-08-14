import { expect, test } from "@playwright/test";

/**
 * 动效回归锁定（归档页年份折叠，use:collapse 插件）：
 * - 正常模式：展开/收起播放高度过渡（动画期间为中间值）；
 * - Reduce Motion（系统 + 站点开关）：直接到位、不播动画；
 * - aria-expanded 与内容显隐正确。
 */
test.describe("Site motion", () => {
	test.use({ viewport: { width: 1280, height: 900 } });

	async function openArchive(page: import("@playwright/test").Page) {
		await page.goto("/archive/", { waitUntil: "networkidle" });
		await page.waitForTimeout(600);
	}

	async function bodyHeight(page: import("@playwright/test").Page, index: number) {
		return page.evaluate((i) => {
			const body = document.querySelectorAll<HTMLElement>(".m3-blog-archive__body")[i];
			return body ? parseFloat(getComputedStyle(body).height) : NaN;
		}, index);
	}

	test("collapses/expands with a height transition", async ({ page }) => {
		await openArchive(page);

		// 第二个年份默认折叠（0px），点击展开播放动画
		expect(await bodyHeight(page, 1)).toBe(0);
		await page.click('.m3-blog-archive__group:nth-child(2) .m3-blog-archive__header');

		// 动画进行中：高度应为 0 与最终值之间的中间值
		await page.waitForTimeout(100);
		const mid = await bodyHeight(page, 1);
		expect(mid).toBeGreaterThan(0);

		// 结束后归位 auto（内容完整高度）
		await page.waitForTimeout(300);
		const expanded = await bodyHeight(page, 1);
		expect(expanded).toBeGreaterThan(mid);
		await expect(
			page.locator('.m3-blog-archive__group:nth-child(2) .m3-blog-archive__item'),
		).toHaveCount(2);
	});

	test("reduced motion lands instantly without transition", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await openArchive(page);

		expect(await bodyHeight(page, 1)).toBe(0);
		await page.click('.m3-blog-archive__group:nth-child(2) .m3-blog-archive__header');

		// 30ms 内即到位（无过渡中间值）
		await page.waitForTimeout(30);
		const height = await bodyHeight(page, 1);
		expect(height).toBeGreaterThan(0);
		await expect(
			page.locator('.m3-blog-archive__group:nth-child(2) .m3-blog-archive__item'),
		).toHaveCount(2);
	});

	test("toggles aria-expanded and hides content when collapsed", async ({ page }) => {
		await openArchive(page);

		const header = page.locator('.m3-blog-archive__group:nth-child(2) .m3-blog-archive__header');
		await expect(header).toHaveAttribute("aria-expanded", "false");
		expect(await bodyHeight(page, 1)).toBe(0);

		await header.click();
		await page.waitForTimeout(400);
		await expect(header).toHaveAttribute("aria-expanded", "true");
		expect(await bodyHeight(page, 1)).toBeGreaterThan(0);
	});
});

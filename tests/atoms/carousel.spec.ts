import { test, expect } from "@playwright/test";
import { openTestPage, readStyle, readBox } from "../helpers/atoms";

/**
 * Carousel 官方对照（Carousel / HorizontalUncontainedCarousel，scroll-snap 实现）
 * 关键：mandatory 默认 / proximity / none；itemWidth <100% 露出相邻卡片；gap、contentPadding；
 * 滚动触发 onchange(index)。
 */
test.describe("Carousel", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-carousel-pull-test");
	});

	test("基础轮播：mandatory 吸附 + 居中 + 间距/内边距生效", async ({ page }) => {
		const scroller = page.locator(".m3-carousel .m3-carousel__scroller").first();
		await expect(scroller).toHaveCSS("scroll-snap-type", "x mandatory");
		const item = scroller.locator("[data-carousel-item]").first();
		await expect(item).toHaveCSS("scroll-snap-align", "center");
		await expect(scroller).toHaveCSS("column-gap", "16px");
		await expect(scroller).toHaveCSS("padding-left", "16px");
	});

	test("proximity 变体使用 proximity 吸附", async ({ page }) => {
		const scroller = page.locator(".m3-carousel--proximity .m3-carousel__scroller");
		const snap = await readStyle(page, ".m3-carousel--proximity .m3-carousel__scroller", "scroll-snap-type");
		// Chrome 会把 proximity（默认值）序列化为 "x"
		expect(["x proximity", "x"]).toContain(snap);
	});

	test("itemWidth=70% 时卡片宽度约为容器 70%", async ({ page }) => {
		const scroller = page.locator(".m3-carousel .m3-carousel__scroller").first();
		const box = await scroller.boundingBox();
		const itemBox = await readBox(page, ".m3-carousel [data-carousel-item]");
		expect(itemBox.width / (box?.width ?? 1)).toBeGreaterThan(0.62);
		expect(itemBox.width / (box?.width ?? 1)).toBeLessThan(0.75);
	});

	test("横向滚动触发 onchange 焦点回调", async ({ page }) => {
		const scroller = page.locator(".m3-carousel .m3-carousel__scroller").first();
		const width = (await scroller.boundingBox())?.width ?? 800;
		await page.locator(".m3-carousel").first().scrollIntoViewIfNeeded();
		await scroller.evaluate((el, w) => el.scrollTo({ left: w * 0.9, behavior: "instant" }), width);
		await expect(page.locator("body")).toContainText(/焦点项 [2-6]/);
	});
});
import { expect, test } from "@playwright/test";
import { openTestPage } from "../helpers/atoms";

/**
 * NavigationBar + Divider 官方对照：
 * - NavigationBar：role=navigation、选中项 aria-current + pill 指示器、点击切换
 * - Divider：1px 水平线、thickness 覆盖、vertical 竖线
 */
test.describe("NavigationBar", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-navbar-divider-test");
	});

	test("渲染导航，选中项 aria-current", async ({ page }) => {
		const bar = page.locator(".m3-nav-bar");
		await expect(bar).toHaveAttribute("role", "navigation");
		const active = bar.locator(".m3-nav-bar__item--active");
		await expect(active).toHaveAttribute("aria-current", "page");
		await expect(active).toContainText("首页");
	});

	test("点击切换选中并回显", async ({ page }) => {
		const bar = page.locator(".m3-nav-bar");
		await bar.getByRole("button", { name: "搜索" }).click();
		await expect(bar.locator(".m3-nav-bar__item--active")).toContainText(
			"搜索",
		);
		await expect(page.locator("body")).toContainText("当前：搜索");
	});

	test("选中项含指示器 pill", async ({ page }) => {
		const bar = page.locator(".m3-nav-bar");
		await expect(
			bar.locator(".m3-nav-bar__item--active .m3-nav-bar__indicator"),
		).toBeVisible();
	});
});

test.describe("Divider", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-navbar-divider-test");
	});

	test("默认 1px 水平线", async ({ page }) => {
		const box = await page.locator(".m3-divider").first().boundingBox();
		expect(Math.round(box?.height ?? 0)).toBe(1);
	});

	test("thickness 覆盖为 2px", async ({ page }) => {
		const box = await page.locator(".m3-divider").nth(1).boundingBox();
		expect(Math.round(box?.height ?? 0)).toBe(2);
	});

	test("vertical 变体为竖线", async ({ page }) => {
		const v = page.locator(".m3-divider--vertical");
		const box = (await v.boundingBox()) ?? { x: 0, y: 0, width: 0, height: 0 };
		expect(box.width).toBeLessThanOrEqual(2);
		expect(box.height).toBeGreaterThan(20);
	});
});

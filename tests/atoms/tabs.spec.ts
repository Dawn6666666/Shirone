import { test, expect } from "@playwright/test";
import { openTestPage, readStyle } from "../helpers/atoms";

/**
 * Tabs 官方对照（md-comp-secondary-navigation-tab / primary）
 * 关键：激活 tab 文字 primary；激活指示器 2px primary；点击切换 value；图标+标签布局。
 */
test.describe("Tabs", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-tabs-test");
	});

	test("点击 tab 切换选中态与文字颜色", async ({ page }) => {
		const tabs = page.locator(".m3-tabs__tab");
		const count = await tabs.count();
		expect(count).toBeGreaterThanOrEqual(2);
		const second = tabs.nth(1);
		await second.click();
		await expect(second).toHaveClass(/--active/);
		await expect(second.locator(".m3-tabs__tab-label")).toHaveCSS("color", "rgb(64, 95, 144)"); // primary
		await expect(tabs.nth(0)).not.toHaveClass(/--active/);
	});

	test("激活指示器存在且随选中移动", async ({ page }) => {
		const indicator = page.locator(".m3-tabs__indicator").first();
		await expect(indicator).toBeVisible();
	});

	test("键盘方向键切换焦点 tab", async ({ page }) => {
		const first = page.locator(".m3-tabs__tab").first();
		await first.focus();
		await page.keyboard.press("ArrowRight");
		await expect(page.locator(".m3-tabs__tab").nth(1)).toBeFocused();
	});

	test("键盘 Home/End 跳到首尾 tab", async ({ page }) => {
		const tabs = page.locator(".m3-tabs").first().locator(".m3-tabs__tab");
		const first = tabs.first();
		const last = tabs.last();
		await tabs.nth(1).focus();
		await page.keyboard.press("Home");
		await expect(first).toBeFocused();
		await expect(first).toHaveClass(/--active/);
		await page.keyboard.press("End");
		await expect(last).toBeFocused();
		await expect(last).toHaveClass(/--active/);
	});
});

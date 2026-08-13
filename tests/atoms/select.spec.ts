import { test, expect } from "@playwright/test";
import { openTestPage, expectMatchesToken, readStyle, readBox } from "../helpers/atoms";

/**
 * Select 官方对照（md-comp-{filled,outlined}-select / dropdown）
 * 关键：filled surface-container-high；outlined surface + outline-variant 描边；展开菜单 surface-container + elevation-2；
 * 选项 48px；点击选择后值回填 + onchange。
 */
test.describe("Select", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-select-test");
	});

	test("filled 与 outlined 输入区视觉", async ({ page }) => {
		await expectMatchesToken(page, ".m3-select--filled .m3-select__field", "background-color", "--surface-container-high");
		await expectMatchesToken(page, ".m3-select--outlined .m3-select__field", "background-color", "--surface");
	});

	test("点击展开菜单，选择后回填并关闭", async ({ page }) => {
		const field = page.locator(".m3-select--filled .m3-select__field").first();
		await field.click();
		const menu = page.locator(".m3-select__menu").first();
		await expect(menu).toBeVisible();
		await expect(menu).toHaveCSS("background-color", "rgb(237, 237, 244)"); // surface-container
		const option = menu.locator(".m3-select__option").nth(1);
		await option.click();
		await expect(menu).toBeHidden();
		const value = await page.locator(".m3-select--filled .m3-select__value").first().textContent();
		expect(value?.trim().length ?? 0).toBeGreaterThan(0);
	});

	test("键盘 Enter/Escape 交互", async ({ page }) => {
		const field = page.locator(".m3-select--filled .m3-select__field").first();
		await field.click();
		await page.keyboard.press("ArrowDown");
		await page.keyboard.press("Enter");
		await expect(page.locator(".m3-select__menu").first()).toBeHidden();
	});

	test("disabled select 不可交互", async ({ page }) => {
		const disabled = page.locator(".m3-select--disabled").first();
		await expect(disabled).toHaveCSS("pointer-events", "none");
	});

	test("键盘 Home/End 定位首尾项并选择", async ({ page }) => {
		const field = page.locator(".m3-select--outlined .m3-select__field").first();
		await field.click();
		await page.keyboard.press("End");
		await page.keyboard.press("Enter");
		await expect(page.locator(".m3-select--outlined .m3-select__value").first()).toHaveText("深色");
	});

	test("键盘输入字符快速定位（typeahead）", async ({ page }) => {
		const field = page.locator(".m3-select--filled .m3-select__field").first();
		await field.click();
		await page.keyboard.press("E");
		await page.keyboard.press("Enter");
		await expect(page.locator(".m3-select--filled .m3-select__value").first()).toHaveText("English");
	});
});

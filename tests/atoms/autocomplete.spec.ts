import { test, expect } from "@playwright/test";
import { openTestPage, expectMatchesToken, readBox, readStyle } from "../helpers/atoms";

/**
 * Autocomplete 官方对照（md-comp-{filled,outlined}-autocomplete）
 * 关键 token：filled 输入区 surface-container-high + corner-medium 顶部圆角；outlined 输入区 surface + 1px outline-variant；
 * error 态：filled 底线/outlined 描边切 error；菜单 surface-container + elevation-2 + corner-extra-small；项高 48px。
 */
test.describe("Autocomplete", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-autocomplete-test");
	});

	test("filled：surface-container-high + 顶部圆角 + 48px 高", async ({ page }) => {
		await expectMatchesToken(page, ".m3-autocomplete--filled .m3-autocomplete__field", "background-color", "--surface-container-high");
		const radius = await readStyle(page, ".m3-autocomplete--filled .m3-autocomplete__field", "border-radius");
		expect(radius).toBe("12px 0px 0px 12px"); // corner-medium top
		const box = await readBox(page, ".m3-autocomplete--filled .m3-autocomplete__field");
		expect(box.height).toBe(48);
	});

	test("outlined error 态：surface 背景 + error 描边 + 4px 圆角", async ({ page }) => {
		// demo 的 outlined 实例即 error 态
		await expectMatchesToken(page, ".m3-autocomplete--outlined .m3-autocomplete__field", "background-color", "--surface");
		await expectMatchesToken(page, ".m3-autocomplete--outlined .m3-autocomplete__field", "border-top-color", "--error");
		const radius = await readStyle(page, ".m3-autocomplete--outlined .m3-autocomplete__field", "border-radius");
		expect(radius).toBe("4px");
	});

	test("输入过滤弹出菜单：surface-container + 4px 圆角 + 48px 项", async ({ page }) => {
		await page.locator(".m3-autocomplete input").first().fill("苹");
		const menu = page.locator(".m3-autocomplete__menu").first();
		await expect(menu).toBeVisible();
		await expectMatchesToken(page, ".m3-autocomplete__menu", "background-color", "--surface-container");
		expect(await readStyle(page, ".m3-autocomplete__menu", "border-radius")).toBe("4px");
		const itemBox = await readBox(page, ".m3-autocomplete__item");
		expect(itemBox.height).toBe(48);
		await expect(menu.locator(".m3-autocomplete__item")).toHaveCount(1);
	});

	test("键盘 ↑↓/Enter 选择并触发 onselect", async ({ page }) => {
		await page.locator(".m3-autocomplete input").first().fill("香");
		await page.keyboard.press("ArrowDown");
		await expect(page.locator(".m3-autocomplete__item--active")).toHaveCount(1);
		await page.keyboard.press("Enter");
		await expect(page.locator(".m3-autocomplete input").first()).toHaveValue("香蕉");
		await expect(page.locator("body")).toContainText("选中：香蕉");
		await expect(page.locator(".m3-autocomplete__menu")).toHaveCount(0);
	});

	test("Esc 关闭菜单；清除按钮清空输入", async ({ page }) => {
		const input = page.locator(".m3-autocomplete input").first();
		await input.fill("苹");
		await expect(page.locator(".m3-autocomplete__menu")).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(page.locator(".m3-autocomplete__menu")).toHaveCount(0);
		await input.fill("苹");
		await page.locator(".m3-autocomplete__clear").first().click();
		await expect(input).toHaveValue("");
	});

	test("disabled 输入框不可用", async ({ page }) => {
		await expect(page.locator(".m3-autocomplete input[disabled]").last()).toBeDisabled();
	});

	test("error 态：支持文本 error 色", async ({ page }) => {
		await expectMatchesToken(page, ".m3-autocomplete__error", "color", "--error");
	});

	test("键盘导航时 aria-activedescendant 指向活动项", async ({ page }) => {
		const input = page.locator(".m3-autocomplete input").first();
		await input.fill("香");
		await page.keyboard.press("ArrowDown");
		await expect(input).toHaveAttribute("aria-activedescendant", /^m3-autocomplete-item-\d+$/);
		await expect(page.locator(".m3-autocomplete__item--active")).toHaveCount(1);
	});

	test("点击外部关闭菜单", async ({ page }) => {
		const input = page.locator(".m3-autocomplete input").first();
		await input.fill("香");
		await expect(page.locator(".m3-autocomplete__menu").first()).toBeVisible();
		await page.locator("h2").first().click();
		await expect(page.locator(".m3-autocomplete__menu")).toHaveCount(0);
	});
});

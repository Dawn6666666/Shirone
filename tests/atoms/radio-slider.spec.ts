import { expect, test } from "@playwright/test";
import { expectMatchesToken, openTestPage } from "../helpers/atoms";

/**
 * RadioButton + Slider 官方对照：
 * - RadioButton：原生 radio 语义、单选组切换、选中环 primary、disabled
 * - Slider：range 语义、value 回写、键盘步进
 */
test.describe("RadioButton", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-radio-slider-test");
	});

	test("默认选中 + 点击切换单选组", async ({ page }) => {
		const apple = page.getByRole("radio", { name: "苹果" });
		const banana = page.getByRole("radio", { name: "香蕉" });
		await expect(apple).toBeChecked();
		await page.locator(".m3-radio").nth(1).click(); // input 隐藏，点击 label
		await expect(banana).toBeChecked();
		await expect(apple).not.toBeChecked();
		await expect(page.locator("body")).toContainText("选择：banana");
	});

	test("disabled 不可交互", async ({ page }) => {
		await expect(page.getByRole("radio", { name: "禁用项" })).toBeDisabled();
	});

	test("选中态外环变 primary", async ({ page }) => {
		await expectMatchesToken(
			page,
			".m3-radio:has(input:checked) .m3-radio__ring",
			"border-top-color",
			"--primary",
		);
	});
});

test.describe("Slider", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-radio-slider-test");
	});

	test("渲染 range 并回写值", async ({ page }) => {
		const slider = page.getByRole("slider", { name: "色相" });
		await expect(slider).toBeVisible();
		await expect(slider).toHaveValue("30");
		await slider.evaluate((el) => {
			(el as HTMLInputElement).value = "80";
			el.dispatchEvent(new Event("input", { bubbles: true }));
		});
		await expect(page.locator("body")).toContainText("值：80");
	});

	test("键盘方向键步进", async ({ page }) => {
		const slider = page.getByRole("slider", { name: "色相" });
		await slider.focus();
		await slider.press("ArrowRight");
		await expect(slider).toHaveValue("31");
	});

	test("键盘 PageUp/PageDown/Home/End 大跨度步进", async ({ page }) => {
		const slider = page.getByRole("slider", { name: "色相" });
		await slider.focus();
		await slider.press("PageUp");
		await expect(slider).toHaveValue("40");
		await slider.press("PageDown");
		await expect(slider).toHaveValue("30");
		await slider.press("Home");
		await expect(slider).toHaveValue("0");
		await slider.press("End");
		await expect(slider).toHaveValue("100");
	});
});

import { expect, test } from "@playwright/test";
import { openTestPage } from "../helpers/atoms";

/**
 * LoadingIndicator + DateInput 官方对照：
 * - LoadingIndicator：progressbar 语义、determinate aria-valuenow、contained/尺寸
 * - DateInput：文本输入 + 浮动 label + 值回显
 */
test.describe("LoadingIndicator", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-loading-date-test");
	});

	test("渲染 progressbar 语义与 determinate 进度", async ({ page }) => {
		const ind = page.locator(".m3-loading").first();
		await expect(ind).toHaveAttribute("role", "progressbar");
		await expect(ind).toHaveAttribute("aria-label", "加载中");
		// 第 5 个为 determinate（progress=0.35）
		await expect(page.locator(".m3-loading").nth(4)).toHaveAttribute(
			"aria-valuenow",
			"0.35",
		);
	});

	test("contained 与自定义尺寸", async ({ page }) => {
		await expect(page.locator(".m3-loading--contained")).toBeVisible();
		const big = page.locator(".m3-loading").nth(3);
		const box = await big.boundingBox();
		expect(Math.round(box?.width ?? 0)).toBe(72);
	});
});

test.describe("DateInput", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-loading-date-test");
	});

	test("输入更新值并浮动 label", async ({ page }) => {
		const input = page.getByRole("textbox", { name: "出生日期" });
		await expect(input).toBeVisible();
		await input.fill("2026-09-01");
		await input.blur(); // blur 校验后回写 value（输入为 YYYY/MM/DD 分段）
		await expect(page.locator("body")).toContainText("当前值：2026-09-01");
		await expect(page.locator(".m3-date-input__label")).toHaveClass(
			/m3-date-input__label--float/,
		);
	});
});

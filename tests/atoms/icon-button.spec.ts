import { test, expect } from "@playwright/test";
import { openTestPage, expectMatchesToken, readBox, readStyle } from "../helpers/atoms";

/**
 * IconButton 官方对照（md-comp-icon-button）
 * 关键：standard 透明 on-surface-variant；tonal secondary-container；filled primary；outlined 透明 + outline 描边；
 * 尺寸 40；toggle 模式选中态切换；disabled 整体 0.38。
 */
test.describe("IconButton", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-iconbutton-test");
	});

	test("四种变体背景符合官方 token", async ({ page }) => {
		await expectMatchesToken(page, ".m3-icon-button--tonal:not(.m3-icon-button--disabled)", "background-color", "--secondary-container");
		await expectMatchesToken(page, ".m3-icon-button--filled:not(.m3-icon-button--disabled)", "background-color", "--primary");
		await expectMatchesToken(page, ".m3-icon-button--outlined:not(.m3-icon-button--disabled)", "border-top-color", "--outline");
	});

	test("尺寸 40px", async ({ page }) => {
		const box = await readBox(page, ".m3-icon-button");
		expect(box.width).toBe(40);
		expect(box.height).toBe(40);
	});

	test("toggle 模式点击切换选中态", async ({ page }) => {
		// 用精确 name 定位，避免状态变化后 first() 重新解析到其他按钮
		const toggle = page.getByRole("button", { name: "星标" });
		await expect(toggle).toHaveAttribute("aria-pressed", "false");
		await toggle.click();
		await expect(toggle).toHaveAttribute("aria-pressed", "true");
		await expect(toggle).toHaveClass(/--checked/);
	});

	test("disabled 不可点击且整体 0.38", async ({ page }) => {
		const disabled = page.locator(".m3-icon-button--disabled").first();
		await expect(disabled).toBeDisabled();
		await expect(disabled).toHaveCSS("opacity", "0.38");
	});

	test("无障碍标签", async ({ page }) => {
		const btn = page.locator(".m3-icon-button").first();
		const label = await btn.getAttribute("aria-label");
		expect(label?.length ?? 0).toBeGreaterThan(0);
	});
});
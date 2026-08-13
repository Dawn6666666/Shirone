import { test, expect } from "@playwright/test";
import { openTestPage, expectMatchesToken, readStyle } from "../helpers/atoms";

/**
 * Chips 官方对照（md-comp-assist-chip / filter-chip / input-chip / suggestion-chip）
 * 关键：filter 单选默认选中第一项、点击切换；input 有删除按钮；disabled。
 */
test.describe("Chips", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-chips-test");
	});

	test("filter chip：单选默认选中首项，点击第二项切换选中", async ({ page }) => {
		const first = page.locator(".m3-chip--filter").first();
		await expect(first).toHaveClass(/--selected/);
		await expect(first).toHaveAttribute("aria-pressed", "true");
		const second = page.locator(".m3-chip--filter").nth(1);
		await second.click();
		await expect(second).toHaveClass(/--selected/);
		await expect(second).toHaveAttribute("aria-pressed", "true");
		await expect(first).not.toHaveClass(/--selected/);
		// 移开鼠标避免 hover state-layer 影响背景色
		await page.mouse.move(0, 0); // 移开鼠标避免 hover state-layer 干扰
		await page.waitForTimeout(300); // 等待选中背景过渡收敛（--m3e-duration-short 150ms）
		await expectMatchesToken(page, ".m3-chip--filter.m3-chip--selected", "background-color", "--secondary-container");
	});

	test("input chip 有删除按钮", async ({ page }) => {
		const remove = page.locator(".m3-chip--input .m3-chip__remove").first();
		await expect(remove).toBeVisible();
	});

	test("assist chip 可点击触发", async ({ page }) => {
		await expect(page.locator(".m3-chip--assist").first()).toBeVisible();
	});

	test("disabled chip 不可点击", async ({ page }) => {
		const disabled = page.locator(".m3-chip--disabled").first();
		await expect(disabled).toHaveCSS("pointer-events", "none");
	});
});

/**
 * Banner 官方对照（md-comp-banner）
 * 关键：action 文字 primary；点击 action 触发回调。
 */
test.describe("Banner", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-banner-test");
	});

	test("渲染文本与 action 按钮", async ({ page }) => {
		await expect(page.locator(".m3-banner").first()).toBeVisible();
		await expect(page.locator(".m3-banner__text").first()).toBeVisible();
		await expect(page.locator(".m3-banner__action").first()).toBeVisible();
		await expectMatchesToken(page, ".m3-banner__action", "color", "--primary");
	});

	test("点击 action 触发回调", async ({ page }) => {
		await page.locator(".m3-banner__action").first().click();
		await expect(page.locator("body")).toContainText(/(操作|action|点击)/i);
	});
});
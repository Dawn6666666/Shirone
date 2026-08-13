import { expect, test } from "@playwright/test";
import { openTestPage } from "../helpers/atoms";

/**
 * P3 增强组件官方对照：
 * - Snackbar：事件总线弹出、action 关闭并回调
 * - Tooltip：hover 延迟显示（plain）
 * - Checkbox 勾选 + SegmentedButton 切换
 * - Dialog 打开 / 关闭；Badge 内容切换
 */
test.describe("Snackbar", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-p3-test");
	});

	test("点击按钮弹出消息", async ({ page }) => {
		await page.getByRole("button", { name: "基础" }).click();
		const snackbar = page.locator(".m3-snackbar");
		await expect(snackbar).toHaveClass(/visible/);
		await expect(snackbar).toContainText("已复制到剪贴板");
	});

	test("action 点击后关闭并触发回调", async ({ page }) => {
		await page.getByRole("button", { name: /带撤销按钮/ }).click();
		const snackbar = page.locator(".m3-snackbar");
		await expect(snackbar).toContainText("撤销");
		await snackbar.getByRole("button", { name: "撤销" }).click();
		await expect(snackbar).not.toHaveClass(/visible/);
		await expect(page.locator("body")).toContainText("带撤销按钮（1）");
	});
});

test.describe("Tooltip", () => {
	test("hover 显示 plain 提示", async ({ page }) => {
		await openTestPage(page, "atoms-p3-test");
		await page.getByRole("button", { name: /复制/ }).hover();
		await page.waitForTimeout(600); // hover 延迟 400ms + 过渡
		const tip = page.locator(".m3-tooltip--open");
		await expect(tip).toBeVisible();
		await expect(tip).toContainText("复制代码");
	});
});

test.describe("Checkbox + SegmentedButton", () => {
	test("Checkbox 勾选回显", async ({ page }) => {
		await openTestPage(page, "atoms-p3-test");
		await page.locator(".m3-checkbox").first().click();
		await expect(page.locator("body")).toContainText("cb1：true");
	});

	test("SegmentedButton 切换", async ({ page }) => {
		await openTestPage(page, "atoms-p3-test");
		await page
			.locator(".m3-segmented__segment")
			.filter({ hasText: "笔记" })
			.click(); // 分段为 label 包裹隐藏 input
		await expect(page.locator("body")).toContainText("segmented：C");
	});
});

test.describe("Dialog", () => {
	test("打开并关闭", async ({ page }) => {
		await openTestPage(page, "atoms-p3-test");
		await page.getByRole("button", { name: "打开对话框" }).click();
		const dialog = page.locator(".m3-dialog");
		await expect(dialog).toBeVisible();
		await expect(dialog).toHaveAttribute("role", "dialog");
		await dialog.getByRole("button", { name: "取消" }).click();
		await expect(dialog).toBeHidden();
	});
});

test.describe("Badge", () => {
	test("数字内容切换", async ({ page }) => {
		await openTestPage(page, "atoms-p3-test");
		await page.getByRole("button", { name: "数字 12" }).click();
		await expect(page.locator(".m3-badge")).toContainText("12");
		await page.getByRole("button", { name: "清空" }).click();
		await expect(page.locator(".m3-badge")).toHaveClass(/m3-badge--dot/);
	});
});

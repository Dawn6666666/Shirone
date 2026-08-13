import { expect, test } from "@playwright/test";
import { openTestPage } from "../helpers/atoms";

/**
 * Switch + SplitButton 官方对照：
 * - Switch：checkbox 语义、点击切换、icons 变体、disabled
 * - SplitButton：主操作回调、trailing 展开菜单、disabled
 */
test.describe("Switch", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-switch-split-test");
	});

	test("默认开 / 点击切换", async ({ page }) => {
		const wifi = page.getByRole("checkbox", { name: "Wi-Fi" });
		await expect(wifi).toBeChecked();
		await page.locator(".m3-switch").first().click(); // input 隐藏，点击 label
		await expect(wifi).not.toBeChecked();
		await expect(page.locator("body")).toContainText("wifi：关");
	});

	test("icons 变体与 disabled", async ({ page }) => {
		await expect(page.locator(".m3-switch--icons")).toHaveCount(1);
		await expect(page.getByRole("checkbox", { name: "禁用" })).toBeDisabled();
	});
});

test.describe("SplitButton", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-switch-split-test");
	});

	test("主操作点击回调", async ({ page }) => {
		await page.getByRole("button", { name: "导出", exact: true }).click();
		await expect(page.locator("body")).toContainText("操作：主操作");
	});

	test("trailing 展开菜单并选择", async ({ page }) => {
		await page.locator(".m3-split-button__trailing").first().click();
		await expect(page.locator(".m3-split-button").first()).toHaveClass(
			/m3-split-button--open/,
		);
		const item = page.getByRole("button", { name: "导出为 JSON" });
		await expect(item).toBeVisible();
		await item.click();
		await expect(page.locator("body")).toContainText("操作：导出为 JSON");
	});

	test("disabled 不可交互", async ({ page }) => {
		await expect(page.getByRole("button", { name: "禁用" })).toBeDisabled();
	});
});

import { expect, test } from "@playwright/test";
import { openTestPage } from "../helpers/atoms";

/**
 * FABMenu 官方对照（FABMenu.kt + md-comp-fab-menu）：
 * - 点击 FAB 展开，菜单项淡入（rAF 300ms 动画）
 * - 点击菜单项收起并触发回调
 * - 互斥单开：展开一个，其他自动收起
 */
test.describe("FABMenu", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-fabmenu-test");
	});

	test("点击 FAB 展开，菜单项可见", async ({ page }) => {
		const fab = page.getByRole("button", { name: "Small" });
		await expect(fab).toHaveAttribute("aria-expanded", "false");
		await fab.click();
		await expect(fab).toHaveAttribute("aria-expanded", "true");
		await page.waitForTimeout(400); // 等待展开动画收敛
		await expect(page.getByRole("button", { name: "编辑" })).toBeVisible();
	});

	test("点击菜单项收起并触发回调", async ({ page }) => {
		await page.getByRole("button", { name: "Medium" }).click();
		await page.waitForTimeout(400);
		const item = page.getByRole("button", { name: "批量安装" });
		await expect(item).toBeVisible();
		await item.click();
		await expect(page.getByRole("button", { name: "Medium" })).toHaveAttribute(
			"aria-expanded",
			"false",
		);
		await expect(page.locator("body")).toContainText("medium·center");
	});

	test("互斥单开：展开一个，其他自动收起", async ({ page }) => {
		await page.getByRole("button", { name: "Medium" }).click();
		await page.waitForTimeout(400);
		await page.getByRole("button", { name: "Large" }).click();
		await page.waitForTimeout(400);
		await expect(page.getByRole("button", { name: "Large" })).toHaveAttribute(
			"aria-expanded",
			"true",
		);
		await expect(page.getByRole("button", { name: "Medium" })).toHaveAttribute(
			"aria-expanded",
			"false",
		);
	});

	test("展开后 FAB 上 ArrowDown 聚焦首个菜单项", async ({ page }) => {
		const fab = page.getByRole("button", { name: "Small" });
		await fab.click();
		await page.waitForTimeout(400);
		await fab.focus();
		await page.keyboard.press("ArrowDown");
		await expect(page.getByRole("button", { name: "编辑" })).toBeFocused();
	});
});

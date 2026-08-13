import { expect, test } from "@playwright/test";
import { openTestPage } from "../helpers/atoms";

/**
 * ListItem + FloatingToolbar + BottomSheet 官方对照：
 * - ListItem：两行/三行布局、点击切换选中（aria-pressed + secondary-container）
 * - FloatingToolbar：展开/收起
 * - BottomSheet：role=dialog + aria-modal，Esc 关闭
 */
test.describe("ListItem", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-list-toolbar-sheet-test");
	});

	test("两行 / 三行布局类", async ({ page }) => {
		const items = page.locator(".m3-list-item");
		await expect(items.nth(0)).toHaveClass(/m3-list-item--two-line/);
		await expect(items.nth(1)).toHaveClass(/m3-list-item--three-line/);
	});

	test("点击切换选中态", async ({ page }) => {
		const clickable = page.getByRole("button", { name: /可点击 \+ 选中/ });
		await clickable.click();
		await expect(clickable).toHaveAttribute("aria-pressed", "true");
		await expect(clickable).toHaveClass(/m3-list-item--selected/);
		const other = page.getByRole("button", { name: /另一个可选项/ });
		await other.click();
		await expect(clickable).not.toHaveClass(/m3-list-item--selected/);
		await expect(other).toHaveClass(/m3-list-item--selected/);
	});
});

test.describe("FloatingToolbar", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-list-toolbar-sheet-test");
	});

	test("展开 / 收起切换", async ({ page }) => {
		const toolbar = page.locator(".m3-toolbar");
		await expect(toolbar).toHaveAttribute("role", "toolbar");
		await expect(toolbar).toHaveClass(/m3-toolbar--expanded/);
		await page
			.locator(".m3-toolbar")
			.locator("..")
			.getByRole("button", { name: "切换" })
			.click(); // 展开态无折叠按钮，用 demo 切换钮
		await expect(toolbar).toHaveClass(/m3-toolbar--collapsed/);
		await page.getByRole("button", { name: "展开工具栏" }).click();
		await expect(toolbar).toHaveClass(/m3-toolbar--expanded/);
	});
});

test.describe("BottomSheet", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-list-toolbar-sheet-test");
	});

	test("打开显示 role=dialog + aria-modal，Esc 关闭", async ({ page }) => {
		await page.getByRole("button", { name: "打开底部弹层" }).click();
		const sheet = page.locator(".m3-sheet");
		await expect(sheet).toBeVisible();
		await expect(sheet).toHaveAttribute("role", "dialog");
		await expect(sheet).toHaveAttribute("aria-modal", "true");
		await page.keyboard.press("Escape");
		await expect(sheet).toBeHidden();
	});
});

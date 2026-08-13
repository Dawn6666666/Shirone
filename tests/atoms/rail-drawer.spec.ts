import { expect, test } from "@playwright/test";
import { openTestPage } from "../helpers/atoms";

/**
 * NavigationRail + NavigationDrawer 官方对照：
 * - Rail：role=navigation、选中项 aria-current + pill、点击切换
 * - Drawer：role=dialog + aria-modal、选中项、Esc 关闭
 */
test.describe("NavigationRail", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-rail-drawer-test");
	});

	test("渲染导航，选中项 aria-current", async ({ page }) => {
		const rail = page.locator(".m3-nav-rail").first();
		await expect(rail).toHaveAttribute("role", "navigation");
		const active = rail.locator(".m3-nav-rail__item--active");
		await expect(active).toHaveAttribute("aria-current", "page");
		await expect(active).toContainText("首页");
	});

	test("点击切换选中并回显", async ({ page }) => {
		const rail = page.locator(".m3-nav-rail").first();
		await rail.getByRole("button", { name: /搜索/ }).click();
		await expect(rail.locator(".m3-nav-rail__item--active")).toContainText(
			"搜索",
		);
		await expect(page.locator("body")).toContainText("当前：搜索");
	});

	test("折叠模式存在（alwaysShowLabel=false）", async ({ page }) => {
		const collapsed = page.locator(".m3-nav-rail__item--collapsed").first();
		await expect(collapsed).toBeVisible();
	});
});

test.describe("NavigationDrawer", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-rail-drawer-test");
	});

	test("打开抽屉，选中项联动", async ({ page }) => {
		await page.getByRole("button", { name: "打开抽屉" }).click();
		const drawer = page.locator(".m3-drawer");
		await expect(drawer).toBeVisible();
		await expect(drawer).toHaveAttribute("role", "dialog");
		await expect(drawer).toHaveAttribute("aria-modal", "true");
		await drawer.getByRole("button", { name: /文章/ }).click();
		await expect(drawer.locator(".m3-drawer__item--active")).toContainText(
			"文章",
		);
	});

	test("Esc 关闭抽屉", async ({ page }) => {
		await page.getByRole("button", { name: "打开抽屉" }).click();
		await expect(page.locator(".m3-drawer")).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(page.locator(".m3-drawer")).toBeHidden();
	});

	test("键盘 Enter 触发选中", async ({ page }) => {
		const rail = page.locator(".m3-nav-rail").first();
		const search = rail.getByRole("button", { name: /搜索/ });
		await search.focus();
		await page.keyboard.press("Enter");
		await expect(rail.locator(".m3-nav-rail__item--active")).toContainText("搜索");
		await expect(page.locator("body")).toContainText("当前：搜索");
	});

	test("打开抽屉自动聚焦首个导航项，Enter 选中", async ({ page }) => {
		await page.getByRole("button", { name: "打开抽屉" }).click();
		const drawer = page.locator(".m3-drawer");
		await expect(drawer).toBeVisible();
		const firstItem = drawer.locator(".m3-drawer__item").first();
		await expect(firstItem).toBeFocused();
		await page.keyboard.press("Enter");
		await expect(drawer.locator(".m3-drawer__item--active")).toHaveCount(1);
	});

	test("点击遮罩关闭抽屉", async ({ page }) => {
		await page.getByRole("button", { name: "打开抽屉" }).click();
		await expect(page.locator(".m3-drawer")).toBeVisible();
		await page.locator(".m3-drawer__scrim").click({ position: { x: 1000, y: 300 } });
		await expect(page.locator(".m3-drawer")).toBeHidden();
	});
});

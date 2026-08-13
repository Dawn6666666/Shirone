import { test, expect } from "@playwright/test";
import { openTestPage, readStyle, readBox } from "../helpers/atoms";

/**
 * SearchView 官方对照（md-comp-search-view / SearchBar.kt）
 * 关键 token：docked corner-extra-large 28px + elevation level3 + 56px 头；fullScreen corner-none + 72px 头；
 * 无内容时不渲染分隔线与内容区（用户验收项）；输入过滤 suggestions；Esc/返回关闭。
 */
test.describe("SearchView", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-searchview-test");
	});

	test("docked：28px 圆角 + surface-container-high + 56px 头", async ({ page }) => {
		const docked = page.locator(".m3-search-view--docked").first();
		await expect(docked).toHaveCSS("border-radius", "28px");
		await expect(docked).toHaveCSS("background-color", "rgb(231, 232, 238)");
		const headerBox = await readBox(page, ".m3-search-view--docked .m3-search-view__header");
		expect(headerBox.height).toBe(56);
	});

	test("docked 有内容时渲染分隔线 + history；输入后显示 suggestions", async ({ page }) => {
		const docked = page.locator(".m3-search-view--docked").nth(0);
		await expect(docked.locator(".m3-search-view__body")).toBeVisible();
		await expect(docked.locator(".m3-search-view__header")).toHaveClass(/--divider/);
		// 空查询只显示 history
		await expect(docked.locator(".m3-search-view__item")).toHaveCount(2);
		await docked.locator(".m3-search-view__input").fill("svel");
		// 输入后 suggestions 过滤为 1 项
		await expect(docked.locator(".m3-search-view__item")).toHaveCount(1);
		await expect(docked.locator(".m3-search-view__item")).toContainText("Svelte");
	});

	test("docked 无内容时不渲染横线与内容区（验收项）", async ({ page }) => {
		const docked = page.locator(".m3-search-view--docked").nth(1);
		await expect(docked.locator(".m3-search-view__body")).toHaveCount(0);
		await expect(docked.locator(".m3-search-view__header")).not.toHaveClass(/--divider/);
	});

	test("点击 suggestion 触发 onselect", async ({ page }) => {
		const docked = page.locator(".m3-search-view--docked").first();
		await docked.locator(".m3-search-view__input").fill("astro");
		await docked.locator(".m3-search-view__item").filter({ hasText: "Astro" }).click();
		await expect(page.locator("body")).toContainText("选择：Astro");
	});

	test("全屏模式：点击打开按钮后出现，返回按钮触发 onclose", async ({ page }) => {
		const trigger = page.getByRole("button", { name: /打开搜索/ });
		await trigger.click();
		const full = page.locator(".m3-search-view--full");
		await expect(full).toBeVisible();
		await expect(full).toHaveCSS("border-radius", "0px");
		await full.locator('button[aria-label="返回"]').click();
		await expect(full).toHaveCount(0);
	});

	test("输入后显示清除按钮，点击清空", async ({ page }) => {
		const docked = page.locator(".m3-search-view--docked").first();
		await docked.locator(".m3-search-view__input").fill("Astro");
		await expect(docked.locator('button[aria-label="清除"]')).toBeVisible();
		await docked.locator('button[aria-label="清除"]').click();
		await expect(docked.locator(".m3-search-view__input")).toHaveValue("");
	});
});
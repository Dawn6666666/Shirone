import { expect, test } from "@playwright/test";
import { openTestPage } from "../helpers/atoms";

/**
 * SearchBar 官方对照（SearchBar.kt docked 展开视图）：
 * - 点击 / 聚焦展开
 * - 输入过滤建议列表
 * - 回车提交搜索并收起
 */
test.describe("SearchBar", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-searchbar-test");
	});

	test("点击展开并聚焦输入框", async ({ page }) => {
		const bar = page.locator(".m3-search-bar").first();
		await bar.locator(".m3-search-bar__field").click();
		await expect(bar.locator(".m3-search-bar__input")).toBeFocused();
	});

	test("输入过滤建议", async ({ page }) => {
		const bar = page.locator(".m3-search-bar").nth(1);
		await bar.locator(".m3-search-bar__field").click();
		await bar.locator(".m3-search-bar__input").fill("主题");
		await expect(bar).toHaveClass(/m3-search-bar--expanded/);
		await expect(bar.locator(".m3-search-suggestion")).toHaveCount(2);
		await expect(bar.locator(".m3-search-suggestion").first()).toContainText(
			"M3E 主题自定义",
		);
	});

	test("回车提交搜索并收起", async ({ page }) => {
		const bar = page.locator(".m3-search-bar").nth(1);
		await bar.locator(".m3-search-bar__field").click();
		await bar.locator(".m3-search-bar__input").fill("入门");
		await bar.locator(".m3-search-bar__input").press("Enter");
		await expect(page.locator("body")).toContainText("回车搜索（入门）");
		await expect(bar).not.toHaveClass(/m3-search-bar--expanded/);
	});
});

import { expect, test } from "@playwright/test";

/**
 * 分类/标签索引页锁定（pages/categories.astro + pages/tags.astro，纯 SSR 直出）。
 * 数据来自 utils/content-utils（getCategoryList / getTagList），断言基于默认数据集；
 * 站点默认语言为 en（siteConfig.lang），文案断言用英文。
 */

test.describe("分类索引页 /categories/", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/categories/");
	});

	test("渲染页头与全部分类行（规格表：名称 + 计数 + 归档过滤链接）", async ({
		page,
	}) => {
		await expect(page.locator(".page-header__title")).toHaveText("Categories");
		// 页头装饰图标：SSR 直出（astro-icon 构建期内联，非空）
		await expect(page.locator(".page-header__icon svg")).toHaveCount(1);
		await expect(
			page.locator('.page-header__icon svg[data-icon="material-symbols:folder-outline-rounded"]'),
		).toHaveCount(1);
		const rows = page.locator(".category-index__row");
		await expect(rows).toHaveCount(2);
		const first = rows.first();
		await expect(first.locator(".category-index__name")).toHaveText("Examples");
		await expect(first.locator(".category-index__count")).toHaveText("5");
		await expect(first).toHaveAttribute(
			"href",
			"/archive/?category=Examples",
		);
		// 行内 MetaIcon 徽标（与 SiteStats 同视觉语言）
		await expect(first.locator(".m3-meta-icon svg")).toHaveCount(1);
	});

	test("分类行可跳转到归档页对应过滤", async ({ page }) => {
		await page
			.locator(".category-index__row")
			.filter({ hasText: "Guides" })
			.click();
		await expect(page).toHaveURL(/[?&]category=Guides/);
	});
});

test.describe("标签索引页 /tags/", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/tags/");
	});

	test("渲染页头与全部标签 chip（名称 + 计数徽标 + 归档过滤链接）", async ({
		page,
	}) => {
		await expect(page.locator(".page-header__title")).toHaveText("Tags");
		// 页头装饰图标：SSR 直出（astro-icon 构建期内联，非空）
		await expect(page.locator(".page-header__icon svg")).toHaveCount(1);
		await expect(
			page.locator('.page-header__icon svg[data-icon="material-symbols:tag-rounded"]'),
		).toHaveCount(1);
		const chips = page.locator(".tag-index__chip");
		await expect(chips).toHaveCount(7);
		const first = chips.first();
		await expect(first).toContainText("Blogging");
		await expect(first.locator(".tag-index__count")).toHaveText("4");
		await expect(first).toHaveAttribute("href", "/archive/?tag=Blogging");
	});

	test("标签 chip 可跳转到归档页对应过滤", async ({ page }) => {
		await page
			.locator(".tag-index__chip")
			.filter({ hasText: "Video" })
			.click();
		await expect(page).toHaveURL(/[?&]tag=Video/);
	});
});

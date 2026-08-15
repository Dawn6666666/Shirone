import { expect, test } from "@playwright/test";

/**
 * 友链页功能锁定（pages/friends.astro -> organisms/FriendSection.svelte，client:only）。
 * 视觉约束对齐站点设计语言：无页内大标题（同归档页）、胶囊搜索条、
 * 官方 Chips 筛选原子、PostCard 风格卡片（hover 箭头 + #tag 弱文本标签）。
 * 数据来自 src/data/friends.ts（getFriendsList 稳定顺序），断言基于默认数据集；
 * 站点默认语言为 en（siteConfig.lang），文案断言用英文。
 */

const FRIEND_COUNT = 3;

test.describe("友链页", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/friends/");
		await expect(page.locator(".friend-card")).toHaveCount(FRIEND_COUNT);
	});

	test("渲染友链卡片（整卡可点，标题 / 描述 / 标签）", async ({ page }) => {
		const first = page.locator(".friend-card").first();
		await expect(first).toHaveAttribute("href", "https://mizuki.mysqil.com");
		await expect(first).toHaveAttribute("target", "_blank");
		await expect(first).toContainText("Mizuki");
		await expect(first).toContainText("Another Fuwari-based blog theme with docs");
		await expect(first.locator(".friend-card__tag").first()).toHaveText("#Blog");
	});

	test("使用站点统一的友链视觉结构", async ({ page }) => {
		// 无页内大标题（同归档页，页面位置由顶栏标识）
		await expect(page.locator(".friend-section__title-row")).toHaveCount(0);
		// PostCard 式箭头（chevron，hover 右滑）
		await expect(page.locator(".friend-card__arrow")).toHaveCount(FRIEND_COUNT);
		// 官方 Chips 原子（filter 形态）承担标签筛选
		await expect(page.locator(".friend-section__chips .m3-chip--filter")).toHaveCount(4);
		// 换链说明为底部脚注
		await expect(page.locator(".friend-section__note")).toBeVisible();
	});

	test("单选标签筛选（再点取消恢复全部，aria-pressed 同步）", async ({ page }) => {
		const blogFilter = page.getByRole("button", { name: "Blog", exact: true });
		await blogFilter.click();
		await expect(blogFilter).toHaveAttribute("aria-pressed", "true");
		await expect(page.locator(".friend-card")).toHaveCount(1);
		await expect(page.getByText("Mizuki", { exact: true })).toBeVisible();
		await blogFilter.click();
		await expect(page.locator(".friend-card")).toHaveCount(FRIEND_COUNT);
		await expect(blogFilter).toHaveAttribute("aria-pressed", "false");
	});

	test("搜索过滤 + 空态", async ({ page }) => {
		await page.locator(".friend-section__search input").fill("Astro");
		await expect(page.locator(".friend-card")).toHaveCount(1);
		await page.locator(".friend-section__search input").fill("no such site");
		await expect(page.locator(".friend-section__empty")).toBeVisible();
	});
});

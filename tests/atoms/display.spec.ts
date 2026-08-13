import { expect, test } from "@playwright/test";
import { openTestPage, readStyle } from "../helpers/atoms";

/**
 * 通用 display 原子：
 * - Avatar：图片渲染 / 首字母回退 / 自定义回退 / 加载失败回退、尺寸与形状
 * - Skeleton：rect / text / circle 变体、尺寸覆盖与 shimmer 动画
 */
test.describe("display/Avatar", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-display-test");
	});

	test("渲染图片头像并设置尺寸 / 形状 / 无障碍", async ({ page }) => {
		const avatar = page.locator(".m3-avatar").first();
		await expect(avatar).toHaveAttribute("role", "img");
		await expect(avatar).toHaveAttribute("aria-label", "用户头像");
		await expect(avatar.locator("img")).toBeVisible();
		const box = await avatar.boundingBox();
		expect(Math.round(box?.width ?? 0)).toBe(64);
		expect(Math.round(box?.height ?? 0)).toBe(64);
		expect(await readStyle(page, ".m3-avatar", "border-radius")).toBe("999px");
	});

	test("无图时显示首字母回退", async ({ page }) => {
		await expect(page.locator(".m3-avatar").nth(1).locator(".m3-avatar__fallback")).toContainText(
			"张",
		);
	});

	test("自定义 fallback 与加载失败回退", async ({ page }) => {
		await expect(page.locator(".m3-avatar").nth(2).locator(".m3-avatar__fallback")).toContainText(
			"M3E",
		);
		// 图片 404 → onerror → 回退 alt 首字符
		await expect(page.locator(".m3-avatar").nth(3).locator(".m3-avatar__fallback")).toContainText(
			"损",
		);
	});
});

test.describe("display/Skeleton", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-display-test");
	});

	test("rect / text / circle 变体与尺寸覆盖", async ({ page }) => {
		const rect = page.locator(".m3-skeleton--rect");
		await expect(rect).toBeVisible();
		const box = await rect.boundingBox();
		expect(Math.round(box?.width ?? 0)).toBe(128); // 8rem
		expect(Math.round(box?.height ?? 0)).toBe(48); // 3rem
		await expect(page.locator(".m3-skeleton--text")).toHaveCount(1);
		await expect(page.locator(".m3-skeleton--circle")).toHaveCount(1);
	});

	test("shimmer 动画存在", async ({ page }) => {
		const anim = await page.locator(".m3-skeleton").first().evaluate((el) => {
			const after = getComputedStyle(el, "::after");
			return after.animationName;
		});
		expect(anim).toContain("m3-skeleton-shimmer");
	});
});

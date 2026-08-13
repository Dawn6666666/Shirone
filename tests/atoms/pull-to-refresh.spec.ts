import { test, expect } from "@playwright/test";
import { openTestPage } from "../helpers/atoms";

/**
 * PullToRefresh 官方对照（PullToRefresh.kt）
 * 关键：threshold 80px + 阻尼 0.4；超过阈值松开触发 onrefresh；刷新中指示器旋转；
 * 仅拦截 scrollTop=0 的下拉；overscroll-behavior: contain。
 */
test.describe("PullToRefresh", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-carousel-pull-test");
		await page.locator(".m3-pull-refresh").scrollIntoViewIfNeeded();
	});

	test("容器具备滚动与 overscroll 约束", async ({ page }) => {
		await expect(page.locator(".m3-pull-refresh")).toHaveCSS("overscroll-behavior-y", "contain");
		await expect(page.locator(".m3-pull-refresh")).toHaveCSS("overflow-y", "auto");
	});

	test("下拉超过阈值（80px，阻尼 0.4 → 拖 260px）松开触发刷新", async ({ page }) => {
		const box = (await page.locator(".m3-pull-refresh").boundingBox())!;
		await page.mouse.move(box.x + box.width / 2, box.y + 40);
		await page.mouse.down();
		await page.mouse.move(box.x + box.width / 2, box.y + 300, { steps: 14 });
		// 260 * 0.4 = 104 >= 80 → 指示器激活
		await expect(page.locator(".m3-pull-refresh__indicator")).toHaveCSS("opacity", "1");
		await page.mouse.up();
		await expect(page.locator(".m3-pull-refresh")).toHaveClass(/--refreshing/);
		await expect(page.locator(".m3-pull-refresh__indicator")).toHaveClass(/--spin/);
		// onrefresh 异步完成（demo 1.2s）后刷新计数 +1
		await expect(page.locator("body")).toContainText(/刷新完成，第 \d+ 次/, { timeout: 5000 });
	});

	test("下拉未达阈值松开不触发刷新", async ({ page }) => {
		const box = (await page.locator(".m3-pull-refresh").boundingBox())!;
		await page.mouse.move(box.x + box.width / 2, box.y + 40);
		await page.mouse.down();
		await page.mouse.move(box.x + box.width / 2, box.y + 120, { steps: 8 }); // 80*0.4=32 < 80
		await page.mouse.up();
		await expect(page.locator(".m3-pull-refresh")).not.toHaveClass(/--refreshing/);
		await expect(page.locator("body")).not.toContainText("刷新完成");
	});
});
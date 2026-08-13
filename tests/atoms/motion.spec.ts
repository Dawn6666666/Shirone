import { expect, test } from "@playwright/test";
import { openTestPage } from "../helpers/atoms";

/**
 * prefers-reduced-motion 动效降级校验：
 * - 系统偏好 reduce → 全局 transition / animation 压至 0.01ms、关闭平滑滚动
 * - 手动 html.motion-reduced 类 → 等效
 * - JS 驱动动画（FABMenu rAF lerp）→ 直接到位
 * 已知边界：LoadingIndicator 的 rAF 循环 morph 属持续加载指示，不随 CSS 降级。
 */
test.describe("动效降级（prefers-reduced-motion）", () => {
	test("系统偏好 reduce：动画与过渡折叠为 0.01ms", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await openTestPage(page, "atoms-progress-nav-test");
		const line = page.locator(
			".m3-progress--indeterminate .m3-progress__line",
		).first();
		await expect(line).toHaveCSS("animation-duration", "1e-05s");
		await expect(page.locator("body")).toHaveCSS("transition-duration", "1e-05s");
	});

	test("骨架屏 shimmer 动画折叠", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await openTestPage(page, "atoms-display-test");
		const anim = await page
			.locator(".m3-skeleton")
			.first()
			.evaluate((el) => getComputedStyle(el, "::after").animationDuration);
		expect(anim).toBe("1e-05s");
	});

	test("手动 motion-reduced 类等效", async ({ page }) => {
		await openTestPage(page, "atoms-progress-nav-test");
		await page.evaluate(() =>
			document.documentElement.classList.add("motion-reduced"),
		);
		const line = page.locator(
			".m3-progress--indeterminate .m3-progress__line",
		).first();
		await expect(line).toHaveCSS("animation-duration", "1e-05s");
	});

	test("FABMenu 在 reduced-motion 下展开进度直接到位", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await openTestPage(page, "atoms-fabmenu-test");
		const fab = page.locator('[style*="fab-progress"]').first();
		await page.getByRole("button", { name: "Small" }).click();
		await expect(fab).toHaveAttribute("style", /fab-progress: 1/);
	});

	test("关闭平滑滚动（scroll-behavior: auto）", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await openTestPage(page, "atoms-blog-test");
		await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");
	});
});

import { expect, test } from "@playwright/test";

/**
 * 文章页目录（TOC）回归锁定：
 * - M3 tonal pill 高亮渲染（不再有旧虚线框 active-indicator）
 * - 滚动时高亮跟随阅读位置（最后滚过视口 35% 线的标题）
 * - 点击目录项锚点定位并同步高亮
 * 注意：TOC 仅在 ≥1536px（2xl）显示，测试需用宽视口。
 */
test.describe("Site TOC", () => {
	test.use({ viewport: { width: 1600, height: 900 } });

	test("scroll highlight and anchor navigation", async ({ page }) => {
		await page.goto("/posts/guide/", { waitUntil: "networkidle" });

		// 等 onload 动画收敛（TOC 初始化依赖稳定的布局尺寸）
		await page.waitForFunction(() => {
			const toc = document.getElementById("toc");
			if (!toc) return false;
			return [...document.querySelectorAll(".onload-animation")].every((el) => {
				if ((el as HTMLElement).offsetParent === null) return true;
				return getComputedStyle(el).opacity === "1";
			});
		});

		const items = page.locator("#toc .m3-blog-toc__item");
		const active = page.locator("#toc .m3-blog-toc__item--active");

		// 目录渲染 + 旧的虚线框指示器已移除
		await expect(items).toHaveCount(2);
		await expect(page.locator("#active-indicator")).toHaveCount(0);

		// 初始高亮第一个标题
		await expect(active).toHaveText(/Front-matter of Posts/);

		// 滚动到底部 → 高亮最后一个标题
		await page.evaluate(() =>
			window.scrollTo(0, document.documentElement.scrollHeight),
		);
		await expect(active).toHaveText(/Where to Place the Post Files/);

		// 点击目录项 → 锚点定位 + 高亮切回
		await page.click('#toc a[href="#front-matter-of-posts"]');
		await expect(page).toHaveURL(/#front-matter-of-posts/);
		await expect(active).toHaveText(/Front-matter of Posts/);
	});
});

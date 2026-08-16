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
		const initialBounds = await page.evaluate(() => {
			const title = document.querySelector(".sidebar-toc .font-bold");
			const wrapper = document.getElementById("toc-inner-wrapper");
			const first = document.querySelector("#toc .m3-blog-toc__item");
			if (!title || !wrapper || !first) return null;
			return {
				titleBottom: title.getBoundingClientRect().bottom,
				wrapperTop: wrapper.getBoundingClientRect().top,
				firstTop: first.getBoundingClientRect().top,
				wrapperScrollTop: wrapper.scrollTop,
			};
		});
		expect(initialBounds).not.toBeNull();
		expect(initialBounds!.wrapperTop).toBeGreaterThanOrEqual(initialBounds!.titleBottom);
		expect(initialBounds!.firstTop).toBeGreaterThanOrEqual(initialBounds!.wrapperTop);
		expect(initialBounds!.wrapperScrollTop).toBe(0);

		// 滚动到底部 → 高亮最后一个标题
		await page.evaluate(() =>
			window.scrollTo(0, document.documentElement.scrollHeight),
		);
		await expect(active).toHaveText(/Where to Place the Post Files/);
		const finalBounds = await page.evaluate(() => {
			const wrapper = document.getElementById("toc-inner-wrapper");
			const items = document.querySelectorAll("#toc .m3-blog-toc__item");
			const last = items.item(items.length - 1);
			if (!wrapper || !last) return null;
			return {
				wrapperBottom: wrapper.getBoundingClientRect().bottom,
				lastBottom: last.getBoundingClientRect().bottom,
			};
		});
		expect(finalBounds).not.toBeNull();
		expect(finalBounds!.lastBottom).toBeLessThanOrEqual(finalBounds!.wrapperBottom);

		// 点击目录项 → 锚点定位 + 高亮切回
		await page.click('#toc a[href="#front-matter-of-posts"]');
		await expect(page).toHaveURL(/#front-matter-of-posts/);
		await expect(active).toHaveText(/Front-matter of Posts/);
	});

	test("keeps a long TOC inside a short viewport", async ({ page }) => {
		await page.setViewportSize({ width: 1600, height: 500 });
		await page.goto("/posts/expressive-code/", { waitUntil: "networkidle" });
		await page.waitForFunction(() =>
			document.querySelector("#toc .m3-blog-toc__item--active"),
		);

		const wrapper = page.locator("#toc-inner-wrapper");
		const items = page.locator("#toc .m3-blog-toc__item");
		expect(await items.count()).toBeGreaterThan(5);
		await expect
			.poll(() =>
				wrapper.evaluate((element) => ({
					clientHeight: element.clientHeight,
					scrollHeight: element.scrollHeight,
				})),
			)
			.toMatchObject({ clientHeight: 324 });
		const scrollSize = await wrapper.evaluate((element) => ({
			clientHeight: element.clientHeight,
			scrollHeight: element.scrollHeight,
		}));
		expect(scrollSize.scrollHeight).toBeGreaterThan(scrollSize.clientHeight);

		const cardBottom = await page
			.locator(".sidebar-toc")
			.evaluate((element) => element.getBoundingClientRect().bottom);
		expect(cardBottom).toBeLessThanOrEqual(500);

		await page.evaluate(() =>
			window.scrollTo(0, document.documentElement.scrollHeight),
		);
		const last = items.last();
		await expect
			.poll(async () => {
				const [wrapperBox, lastBox] = await Promise.all([
					wrapper.boundingBox(),
					last.boundingBox(),
				]);
				if (!wrapperBox || !lastBox) return false;
				return lastBox.y + lastBox.height <= wrapperBox.y + wrapperBox.height;
			})
			.toBe(true);

		await items.first().click();
		await expect(items.first()).toHaveClass(/m3-blog-toc__item--active/);
		await expect
			.poll(() =>
				page.evaluate(
					() => document.getElementById("expressive-code")?.getBoundingClientRect().top,
				),
			)
			.toBe(80);
		await expect
			.poll(() => wrapper.evaluate((element) => element.scrollTop))
			.toBe(0);
		await expect(items.first()).toHaveClass(/m3-blog-toc__item--active/);

		await items.last().click();
		await expect(items.last()).toHaveClass(/m3-blog-toc__item--active/);
		await expect
			.poll(() =>
				wrapper.evaluate(
					(element) => element.scrollHeight - element.clientHeight - element.scrollTop,
				),
			)
			.toBeLessThanOrEqual(1);
	});
});

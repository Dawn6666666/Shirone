import { test, expect } from "@playwright/test";
import { openTestPage, expectMatchesToken, readBox, readStyle } from "../helpers/atoms";

/**
 * FAB 官方对照（md-comp-{fab,extended-fab}-{primary,secondary,tertiary,surface}）
 * 关键 token：尺寸 small 40 / regular 56 / large 96；Extended small&regular 56 高、large 96 高；
 * 默认圆角 corner-large；lowered 高度 level1。
 */
test.describe("FAB", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-fab-test");
	});

	test("四种变体容器色与图标色符合官方 token", async ({ page }) => {
		const variants = [
			["primary", "--primary-container", "--on-primary-container"],
			["secondary", "--secondary-container", "--on-secondary-container"],
			["tertiary", "--tertiary-container", "--on-tertiary-container"],
			["surface", "--surface-container-high", "--primary"],
		];
		for (const [variant, bgToken, fgToken] of variants) {
			const sel = `.m3-fab--${variant}:not(.m3-fab--extended)`;
			await expectMatchesToken(page, sel, "background-color", bgToken, `${variant} 背景`);
			await expectMatchesToken(page, sel, "color", fgToken, `${variant} 前景`);
		}
	});

	test("图标形态尺寸 40/56/96", async ({ page }) => {
		const cases = [
			["small", 40],
			["regular", 56],
			["large", 96],
		];
		for (const [size, px] of cases) {
			const box = await readBox(page, `.m3-fab--${size}:not(.m3-fab--extended)`);
			expect(box.width).toBe(px);
			expect(box.height).toBe(px);
		}
	});

	test("Extended：small/regular 同 56 高，large 96 高", async ({ page }) => {
		for (const size of ["small", "regular"]) {
			const box = await readBox(page, `.m3-fab--${size}.m3-fab--extended`);
			expect(box.height).toBe(56);
		}
		const large = await readBox(page, ".m3-fab--large.m3-fab--extended");
		expect(large.height).toBe(96);
	});

	test("lowered 用 elevation level1（阴影弱于默认 level3）", async ({ page }) => {
		const lowered = await readStyle(page, ".m3-fab--lowered:not(.m3-fab--extended)", "box-shadow");
		const normal = await readStyle(page, ".m3-fab--primary:not(.m3-fab--lowered):not(.m3-fab--extended)", "box-shadow");
		expect(lowered).not.toBe("none");
		expect(normal).not.toBe("none");
		// 解析 "color(srgb r g b / a)" 或 "rgba(r,g,b,a)" 首层 alpha
		const alpha = (s: string) => {
			const m = s.match(/color\(srgb[^/]*\/\s*([\d.]+)/) ?? s.match(/rgba?\([^)]*,\s*([\d.]+)\)/);
			return m ? parseFloat(m[1]) : 0;
		};
		expect(alpha(lowered)).toBeLessThan(alpha(normal));
	});

	test("radius 覆盖：默认 16 / m 12 / full 圆形 / 自定义 24px", async ({ page }) => {
		const byRadiusVar = (v: string) =>
			page.locator(`.m3-fab[style*="${v}"]`).first().evaluate((el) => getComputedStyle(el).borderRadius);
		expect(await readStyle(page, ".m3-fab--primary:not(.m3-fab--extended):not(.m3-fab--lowered)", "border-radius")).toBe("16px");
		expect(await byRadiusVar("shape-corner-m")).toBe("12px");
		expect(await byRadiusVar("shape-corner-full")).toBe("999px");
		expect(await byRadiusVar("24px")).toBe("24px");
	});

	test("disabled 呈现 0.38 透明度且不可点击", async ({ page }) => {
		const disabled = page.locator(".m3-fab--disabled").first();
		await expect(disabled).toBeDisabled();
		const opacity = await disabled.evaluate((el) => getComputedStyle(el).opacity);
		expect(opacity).toBe("0.38");
	});

	test("点击触发回调（日志更新）", async ({ page }) => {
		await page.locator(".m3-fab--primary:not(.m3-fab--extended)").first().click();
		await expect(page.locator("body")).toContainText("primary");
	});
});
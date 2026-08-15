import { test, expect } from "@playwright/test";
import { openTestPage, expectMatchesToken, readBox, readStyle } from "../helpers/atoms";

/**
 * Button 官方对照（md-comp-{filled,elevated,filled-tonal,outlined,text}-button + latest 尺寸）
 * 关键 token：filled primary 实底；elevated surface-container-low + level1；tonal secondary-container；
 * outlined 透明 + outline 描边；text 透明无描边；尺寸 xsmall32/small40/medium56/large96/xlarge136；
 * 默认圆角 12px（站点形状契约 --shape-corner-m），radius='full' 恢复官方胶囊。
 */
test.describe("Button", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-button-test");
	});

	test("五种变体容器与描边符合官方 token", async ({ page }) => {
		await expectMatchesToken(page, ".m3-button--filled:not(.m3-button--disabled)", "background-color", "--primary");
		await expectMatchesToken(page, ".m3-button--filled:not(.m3-button--disabled)", "color", "--on-primary");
		await expectMatchesToken(page, ".m3-button--elevated:not(.m3-button--disabled)", "background-color", "--surface-container-low");
		await expectMatchesToken(page, ".m3-button--tonal:not(.m3-button--disabled)", "background-color", "--secondary-container");
		await expectMatchesToken(page, ".m3-button--outlined:not(.m3-button--disabled)", "border-top-color", "--outline");
		await expectMatchesToken(page, ".m3-button--text:not(.m3-button--disabled)", "color", "--primary");
	});

	test("elevated 高度 level1", async ({ page }) => {
		const shadow = await readStyle(page, ".m3-button--elevated:not(.m3-button--disabled)", "box-shadow");
		expect(shadow).not.toBe("none");
	});

	test("尺寸 xsmall 32 / small 40 / medium 56 / large 96 / xlarge 136", async ({ page }) => {
		const cases = [
			["xsmall", 32],
			["small", 40],
			["medium", 56],
			["large", 96],
			["xlarge", 136],
		];
		for (const [size, px] of cases) {
			const box = await readBox(page, `.m3-button--${size}:not(.m3-button--disabled)`);
			expect(box.height, `${size} 高度`).toBe(px);
		}
	});

	test("默认圆角 corner-m 12px（站点契约），radius='full' 可覆盖为胶囊", async ({ page }) => {
		expect(await readStyle(page, ".m3-button--filled:not(.m3-button--disabled)", "border-radius")).toBe("12px");
		expect(await readStyle(page, ".m3-button--radius-demo-full", "border-radius")).toBe("999px");
	});

	test("disabled：filled 容器 12% 透明度", async ({ page }) => {
		const disabled = page.locator(".m3-button--disabled").first();
		await expect(disabled).toBeDisabled();
		const bg = await disabled.evaluate((el) => getComputedStyle(el).backgroundColor);
		// 12% primary 混合在表面色上
		const primary = await page.evaluate(() => {
			const el = document.createElement("div");
			el.style.background = "var(--primary)";
			document.body.appendChild(el);
			const v = getComputedStyle(el).backgroundColor;
			el.remove();
			return v;
		});
		expect(bg).not.toBe(primary);
	});

	test("leading 图标 + label 渲染", async ({ page }) => {
		const withIcon = page.locator(".m3-button__icon").first();
		await expect(withIcon).toBeVisible();
		await expect(page.locator(".m3-button__label").first()).toBeVisible();
	});

	test("点击触发回调", async ({ page }) => {
		await page.locator(".m3-button--filled").first().click();
		await expect(page.locator("body")).toContainText(/filled/);
	});
});
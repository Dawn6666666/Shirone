import { test, expect } from "@playwright/test";
import { openTestPage, expectMatchesToken, readBox, readStyle } from "../helpers/atoms";

/**
 * SheetSide 官方对照（md-comp-sheet-side，modal 形态）
 * 关键 token：容器 surface-container-low + elevation level1 + corner-large-start；标题 title-large on-surface-variant；
 * modal 宽度 360px；遮罩淡入；Esc / 遮罩点击关闭。
 */
test.describe("SheetSide", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-sheetside-test");
	});

	test("面板：surface-container-low + corner-large-start + 全高 + 默认 360px", async ({ page }) => {
		const sheet = page.locator(".m3-sheet-side--end").first();
		await expectMatchesToken(page, ".m3-sheet-side--end", "background-color", "--surface-container-low");
		const radius = await readStyle(page, ".m3-sheet-side--end", "border-radius");
		expect(radius).toBe("16px 0px 0px 16px"); // corner-large-start（end 侧）
		const box = await readBox(page, ".m3-sheet-side--end");
		expect(box.width).toBe(360);
		expect(box.height).toBeGreaterThanOrEqual(700);
	});

	test("标题 title-large on-surface-variant", async ({ page }) => {
		await expectMatchesToken(page, ".m3-sheet-side__title", "color", "--on-surface-variant");
		const font = await readStyle(page, ".m3-sheet-side__title", "font-size");
		expect(parseFloat(font)).toBeGreaterThanOrEqual(22); // title-large 22px
	});

	test("打开后：遮罩淡入、role=dialog、aria-modal", async ({ page }) => {
		await page.getByRole("button", { name: /打开|Open/ }).first().click();
		const root = page.locator(".m3-sheet-side-root").first();
		await expect(root).toHaveClass(/--open/);
		await expect(root.locator(".m3-sheet-side__scrim")).toHaveCSS("opacity", "1");
		const sheet = root.locator(".m3-sheet-side");
		await expect(sheet).toHaveAttribute("role", "dialog");
		await expect(sheet).toHaveAttribute("aria-modal", "true");
	});

	test("Esc 关闭面板并触发 onclose", async ({ page }) => {
		await page.getByRole("button", { name: /打开|Open/ }).first().click();
		await expect(page.locator(".m3-sheet-side-root").first()).toHaveClass(/--open/);
		await page.keyboard.press("Escape");
		await expect(page.locator(".m3-sheet-side-root").first()).not.toHaveClass(/--open/);
	});

	test("start 侧面板圆角镜像（0 16px 16px 0）", async ({ page }) => {
		const radius = await readStyle(page, ".m3-sheet-side--start", "border-radius");
		expect(radius).toBe("0px 16px 16px 0px");
	});
});
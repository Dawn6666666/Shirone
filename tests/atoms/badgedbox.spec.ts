import { expect, test } from "@playwright/test";
import { openTestPage } from "../helpers/atoms";

/**
 * BadgedBox 官方对照（Compose BadgedBox）：
 * - 徽标锚定右上角（translate(50%, -50%)）
 * - 数字内容切换 / 清空后 dot
 */
test.describe("BadgedBox", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-badgedbox-test");
	});

	test("渲染锚点与徽标", async ({ page }) => {
		await expect(page.locator(".m3-badged-box")).toHaveCount(2);
		await expect(page.locator(".m3-badged-box__badge .m3-badge")).toHaveCount(
			2,
		);
	});

	test("数字徽标显示内容并可切换", async ({ page }) => {
		await expect(page.locator(".m3-badged-box").first()).toContainText("3");
		await page.getByRole("button", { name: "数字 12" }).click();
		await expect(page.locator(".m3-badged-box").first()).toContainText("12");
	});

	test("清空后变为 dot", async ({ page }) => {
		await page.getByRole("button", { name: "清空" }).click();
		await expect(
			page.locator(".m3-badged-box").first().locator(".m3-badge"),
		).toHaveClass(/m3-badge--dot/);
	});

	test("徽标锚定在锚点右上角", async ({ page }) => {
		const box = page.locator(".m3-badged-box").first();
		const anchor = (await box.boundingBox()) ?? {
			x: 0,
			y: 0,
			width: 0,
			height: 0,
		};
		const badge = (await box
			.locator(".m3-badged-box__badge")
			.boundingBox()) ?? { x: 0, y: 0, width: 0, height: 0 };
		const badgeCenterX = badge.x + badge.width / 2;
		const badgeCenterY = badge.y + badge.height / 2;
		expect(badgeCenterX).toBeGreaterThan(anchor.x + anchor.width / 2);
		expect(badgeCenterY).toBeLessThan(anchor.y + anchor.height / 2);
	});
});

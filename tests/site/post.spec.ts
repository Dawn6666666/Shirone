import { expect, test } from "@playwright/test";

/**
 * 文章页回归：复制链接按钮。
 * 点击后把当前文章 URL 写入剪贴板，并弹出 Snackbar 提示。
 */
test.describe("Site post", () => {
	test.use({ viewport: { width: 1280, height: 900 } });

	test("copy link writes the post URL and shows a snackbar", async ({
		page,
		context,
	}) => {
		await context.grantPermissions(["clipboard-read", "clipboard-write"], {
			origin: "http://localhost:4321",
		});
		await page.goto("/posts/guide/", { waitUntil: "networkidle" });
		await page.waitForTimeout(600);

		await expect(page.locator("#copy-post-link")).toHaveCount(1);
		await page.click("#copy-post-link");
		await page.waitForTimeout(400);

		const clipboard = await page.evaluate(() => navigator.clipboard.readText());
		expect(clipboard).toBe("http://localhost:4321/posts/guide/");

		const snackbar = page.locator(".m3-snackbar");
		await expect(snackbar).toHaveClass(/visible/);
		await expect(page.locator(".m3-snackbar__message")).toHaveText(
			"Copied to clipboard",
		);
	});
});

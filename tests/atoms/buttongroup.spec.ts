import { expect, test } from "@playwright/test";
import { openTestPage } from "../helpers/atoms";

/**
 * ToggleButton + ButtonGroup 官方对照（ToggleButtonShapes / ButtonGroup.kt）：
 * - ToggleButton：aria-pressed 切换、checked 变体、disabled 不可交互
 * - ButtonGroup standard 单选 / 多选；connected 变体；weight 权重布局
 */
test.describe("ToggleButton", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-buttongroup-test");
	});

	test("点击切换 aria-pressed 与 checked 态", async ({ page }) => {
		const filled = page.getByRole("button", { name: "filled" });
		await expect(filled).toHaveAttribute("aria-pressed", "false");
		await filled.click();
		await expect(filled).toHaveAttribute("aria-pressed", "true");
		await expect(filled).toHaveClass(/m3-toggle-button--checked/);
		await expect(page.locator("body")).toContainText("A开");
	});

	test("disabled 不可交互", async ({ page }) => {
		const disabled = page.getByRole("button", { name: "disabled" });
		await expect(disabled).toBeDisabled();
		await expect(disabled).toHaveAttribute("aria-pressed", "false");
	});
});

test.describe("ButtonGroup", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-buttongroup-test");
	});

	test("standard 单选：点击切换选中并回显", async ({ page }) => {
		const group = page.locator(".m3-button-group").first();
		await group.getByRole("button", { name: "笔记" }).click();
		await expect(group.getByRole("button", { name: "笔记" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		await expect(page.locator("body")).toContainText("单选：笔记");
	});

	test("standard 多选：再点取消选中", async ({ page }) => {
		const group = page.locator(".m3-button-group").nth(1);
		await group.getByRole("button", { name: "文章" }).click();
		await expect(group.getByRole("button", { name: "文章" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		await expect(page.locator("body")).toContainText("多选：全部、存档、文章");
		await group.getByRole("button", { name: "存档" }).click();
		await expect(group.getByRole("button", { name: "存档" })).toHaveAttribute(
			"aria-pressed",
			"false",
		);
	});

	test("connected 变体渲染并可单选", async ({ page }) => {
		const group = page.locator(".m3-button-group--connected").first();
		await group.getByRole("button", { name: "列表" }).click();
		await expect(group.getByRole("button", { name: "列表" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
		await expect(page.locator("body")).toContainText("connected 单选：列表");
	});

	test("weight 布局按权重分配 flex-grow", async ({ page }) => {
		const group = page.locator(".m3-button-group").nth(6);
		const accept = group.getByRole("button", { name: "接受" });
		await expect(accept).toHaveCSS("flex-grow", "2");
		await expect(group.getByRole("button", { name: "拒绝" })).toHaveCSS(
			"flex-grow",
			"1",
		);
	});
});

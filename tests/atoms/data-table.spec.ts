import { test, expect } from "@playwright/test";
import { openTestPage, expectMatchesToken, readBox, readStyle } from "../helpers/atoms";

/**
 * DataTable 官方对照（md-comp-data-table）
 * 关键 token：容器 corner-extra-small 4px + outline-variant 1px；表头 56px title-small on-surface-variant；
 * 行 52px body-medium on-surface；选中行 surface-container-highest；footer 52px；复选列 56px。
 */
test.describe("DataTable", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-datatable-test");
	});

	test("容器：4px 圆角 + outline-variant 1px 描边 + surface 背景", async ({ page }) => {
		await expectMatchesToken(page, ".m3-data-table", "background-color", "--surface");
		await expectMatchesToken(page, ".m3-data-table", "border-top-color", "--outline-variant");
		const radius = await readStyle(page, ".m3-data-table", "border-radius");
		expect(radius).toBe("4px");
		const borderWidth = await readStyle(page, ".m3-data-table", "border-top-width");
		expect(borderWidth).toBe("1px");
	});

	test("表头 56px title-small on-surface-variant", async ({ page }) => {
		const box = await readBox(page, ".m3-data-table thead tr");
		expect(box.height).toBe(56);
		await expectMatchesToken(page, ".m3-data-table thead tr", "color", "--on-surface-variant");
		expect(await readStyle(page, ".m3-data-table th", "font-weight")).toBe("700");
	});

	test("数据行 52px body-medium on-surface", async ({ page }) => {
		const box = await readBox(page, ".m3-data-table tbody tr");
		expect(box.height).toBe(52);
		await expectMatchesToken(page, ".m3-data-table tbody td", "color", "--on-surface");
		await expectMatchesToken(page, ".m3-data-table tbody tr", "border-top-color", "--outline-variant");
	});

	test("选中行 surface-container-highest 高亮", async ({ page }) => {
		const tables = page.locator(".m3-data-table");
		const cb = tables.nth(1).locator("tbody tr input[type=checkbox]").first();
		await cb.click();
		await expect(tables.nth(1).locator("tbody tr.m3-data-table__selected")).toHaveCount(1);
		await expectMatchesToken(page, ".m3-data-table tbody tr.m3-data-table__selected", "background-color", "--surface-container-highest");
	});

	test("footer 52px body-medium on-surface-variant", async ({ page }) => {
		const tables = page.locator(".m3-data-table");
		await expect(tables.nth(1).locator(".m3-data-table__footer")).toHaveText(/共/);
		const box = await readBox(page, ".m3-data-table .m3-data-table__footer");
		expect(box.height).toBe(52);
		await expectMatchesToken(page, ".m3-data-table .m3-data-table__footer", "color", "--on-surface-variant");
	});

	test("可排序表头点击触发排序并切换方向图标", async ({ page }) => {
		const th = page.locator(".m3-data-table th").filter({ hasText: "姓名" }).first();
		await th.click();
		await expect(page.locator("body")).toContainText("排序：name 升序");
		await expect(page.locator(".m3-data-table__sort-icon .desc")).toHaveCount(0);
		await th.click();
		await expect(page.locator("body")).toContainText("排序：name 降序");
		await expect(page.locator(".m3-data-table__sort-icon .desc")).toHaveCount(1);
	});

	test("行点击回调", async ({ page }) => {
		await page.locator(".m3-data-table tbody tr").first().click();
		await expect(page.locator("body")).toContainText("点击行：Alice");
	});
});
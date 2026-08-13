import { expect, test } from "@playwright/test";
import { openTestPage } from "../helpers/atoms";

/**
 * AlertDialog + TextField + ExposedDropdownMenu + SegmentedButton + 日期组件 官方对照：
 * - AlertDialog：role=alertdialog，取消/确认回显
 * - TextField：blur 校验错误态
 * - ExposedDropdownMenu：listbox 选择回显
 * - DatePicker / DateRangePicker：选择日期与范围中间高亮
 */
test.describe("AlertDialog", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-rest-test");
	});

	test("打开 / 取消回显", async ({ page }) => {
		await page.getByRole("button", { name: "打开警示对话框" }).click();
		const alert = page.locator(".m3-alert");
		await expect(alert).toBeVisible();
		await expect(alert).toHaveAttribute("role", "alertdialog");
		await expect(alert).toHaveAttribute("aria-modal", "true");
		await alert.getByRole("button", { name: "取消" }).click();
		await expect(page.locator("body")).toContainText("已取消");
		await expect(alert).toBeHidden();
	});

	test("确认回显", async ({ page }) => {
		await page.getByRole("button", { name: "打开警示对话框" }).click();
		await page
			.locator(".m3-alert")
			.getByRole("button", { name: "删除" })
			.click();
		await expect(page.locator("body")).toContainText("已确认");
	});
});

test.describe("TextField", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-rest-test");
	});

	test("blur 校验错误态", async ({ page }) => {
		const field = page.getByRole("textbox", { name: "用户名" });
		await field.fill("ab");
		await field.blur();
		await expect(page.locator(".m3-text-field--error")).toBeVisible();
		await expect(page.locator(".m3-text-field__error")).toContainText(
			"至少 3 个字符",
		);
	});

	test("合法输入清除错误", async ({ page }) => {
		const field = page.getByRole("textbox", { name: "用户名" });
		await field.fill("shirone");
		await field.blur();
		await expect(page.locator(".m3-text-field").first()).not.toHaveClass(
			/m3-text-field--error/,
		);
	});
});

test.describe("ExposedDropdownMenu", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-rest-test");
	});

	test("展开 listbox 并选择", async ({ page }) => {
		const dropdown = page.locator(".m3-dropdown");
		await dropdown.getByRole("button", { name: "深色" }).click();
		await expect(dropdown.locator('[role="listbox"]')).toBeVisible();
		await dropdown.getByRole("option", { name: "浅色" }).click();
		await expect(dropdown.getByRole("button", { name: "浅色" })).toBeVisible();
	});
});

test.describe("SegmentedButton 多选", () => {
	test("点击切换勾选", async ({ page }) => {
		await openTestPage(page, "atoms-rest-test");
		await page
			.locator(".m3-segmented__segment")
			.filter({ hasText: "Astro" })
			.click();
		await expect(page.locator("body")).toContainText("svelte、astro");
	});
});

test.describe("DatePicker", () => {
	test("选择日期并回显", async ({ page }) => {
		await openTestPage(page, "atoms-rest-test");
		const picker = page.locator(".m3-date-picker");
		await expect(picker).toBeVisible();
		const day = picker.locator('.m3-date-picker__day[aria-label="2026-08-20"]');
		await day.click();
		await expect(day).toHaveAttribute("aria-pressed", "true");
		await expect(page.locator("body")).toContainText("选中：2026-08-20");
	});

	test("月份导航切换", async ({ page }) => {
		await openTestPage(page, "atoms-rest-test");
		const picker = page.locator(".m3-date-picker").first();
		await expect(picker.locator(".m3-date-picker__month")).toHaveText("2026年8月");
		await picker.getByRole("button", { name: "下个月" }).click();
		await expect(picker.locator(".m3-date-picker__month")).toHaveText("2026年9月");
		await picker.getByRole("button", { name: "上个月" }).click();
		await expect(picker.locator(".m3-date-picker__month")).toHaveText("2026年8月");
	});

});

test.describe("DateRangePicker", () => {
	test("选择范围并高亮中间日期", async ({ page }) => {
		await openTestPage(page, "atoms-rest-test");
		const picker = page.locator(".m3-date-range-picker");
		const day = (iso: string) =>
			picker.locator(`.m3-date-picker__day[aria-label="${iso}"]`);
		await day("2026-08-06").click();
		await day("2026-08-10").click();
		await expect(page.locator("body")).toContainText(
			"范围：2026-08-06 ~ 2026-08-10",
		);
		await expect(
			picker.locator(".m3-date-range-picker__day-wrap--mid").first(),
		).toBeVisible();
	});
});

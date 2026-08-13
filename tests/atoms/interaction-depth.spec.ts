import { expect, test } from "@playwright/test";
import { openTestPage } from "../helpers/atoms";

/**
 * 交互深度测试 — 键盘 / 焦点 / 状态联动（组件质量专项）
 * 为仅有点击/视觉断言的剩余原子补齐：
 * - Dialog / AlertDialog：焦点陷阱 + Esc / 遮罩关闭 + 焦点返还
 * - Checkbox / SegmentedButton / Switch：原生表单键盘语义与三态
 * - Menu：Esc / 点击外部 / 互斥单开
 * - Tooltip：键盘聚焦可达 + aria-describedby
 * - Snackbar：无操作自动消失
 * - Card / ToggleButton / ButtonGroup：键盘 Enter/Space 触发
 * - NavigationBar / ListItem：键盘 Enter 切换选中
 * - FloatingToolbar / BottomSheet：键盘展开 / 遮罩关闭
 * - ExposedDropdownMenu：aria-expanded + Esc + 外部点击 + 键盘选择
 * - DatePicker / DateRangePicker：键盘选择日期与范围
 * - TimePicker：键盘切换输入模式 + 自动跳格 + 非法校验
 * - SearchBar：Esc 收起 + ArrowDown 进建议列表
 */
test.describe("Dialog 交互深度", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-p3-test");
	});

	test("打开后聚焦容器，Esc 关闭", async ({ page }) => {
		await page.getByRole("button", { name: "打开对话框" }).click();
		const dialog = page.locator(".m3-dialog");
		await expect(dialog).toBeVisible();
		await expect(dialog).toBeFocused();
		await page.keyboard.press("Escape");
		await expect(dialog).toBeHidden();
	});

	test("焦点陷阱：Tab 在操作按钮间循环", async ({ page }) => {
		await page.getByRole("button", { name: "打开对话框" }).click();
		const dialog = page.locator(".m3-dialog");
		const cancel = dialog.getByRole("button", { name: "取消" });
		const confirm = dialog.getByRole("button", { name: "确认" });
		await page.keyboard.press("Tab");
		await expect(cancel).toBeFocused();
		await page.keyboard.press("Tab");
		await expect(confirm).toBeFocused();
		await page.keyboard.press("Tab");
		await expect(cancel).toBeFocused();
		await page.keyboard.press("Shift+Tab");
		await expect(confirm).toBeFocused();
	});

	test("遮罩点击关闭", async ({ page }) => {
		await page.getByRole("button", { name: "打开对话框" }).click();
		const dialog = page.locator(".m3-dialog");
		await expect(dialog).toBeVisible();
		await page
			.locator(".m3-dialog-scrim")
			.click({ position: { x: 200, y: 200 } });
		await expect(dialog).toBeHidden();
	});

	test("关闭后焦点返还触发按钮", async ({ page }) => {
		const trigger = page.getByRole("button", { name: "打开对话框" });
		await trigger.click();
		await expect(page.locator(".m3-dialog")).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(trigger).toBeFocused();
	});
});

test.describe("AlertDialog 交互深度", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-rest-test");
	});

	test("Esc 关闭 + 焦点返还", async ({ page }) => {
		const trigger = page.getByRole("button", { name: "打开警示对话框" });
		await trigger.click();
		const alert = page.locator(".m3-alert");
		await expect(alert).toBeVisible();
		await expect(alert).toBeFocused();
		await page.keyboard.press("Escape");
		await expect(alert).toBeHidden();
		await expect(trigger).toBeFocused();
	});

	test("焦点陷阱：Tab 在取消/删除间循环", async ({ page }) => {
		await page.getByRole("button", { name: "打开警示对话框" }).click();
		const alert = page.locator(".m3-alert");
		const dismiss = alert.getByRole("button", { name: "取消" });
		const confirm = alert.getByRole("button", { name: "删除" });
		await page.keyboard.press("Tab");
		await expect(dismiss).toBeFocused();
		await page.keyboard.press("Shift+Tab");
		await expect(confirm).toBeFocused();
		await page.keyboard.press("Tab");
		await expect(dismiss).toBeFocused();
	});

	test("遮罩点击关闭", async ({ page }) => {
		await page.getByRole("button", { name: "打开警示对话框" }).click();
		const alert = page.locator(".m3-alert");
		await expect(alert).toBeVisible();
		await page
			.locator(".m3-alert-scrim")
			.click({ position: { x: 200, y: 200 } });
		await expect(alert).toBeHidden();
	});
});

test.describe("Checkbox 键盘与三态", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-p3-test");
	});

	test("Space 切换勾选", async ({ page }) => {
		const input = page.locator(".m3-checkbox__input").first();
		await input.focus();
		await page.keyboard.press("Space");
		await expect(page.locator("body")).toContainText("cb1：true");
		await page.keyboard.press("Space");
		await expect(page.locator("body")).toContainText("cb1：false");
	});

	test("triState 三态循环 false→true→null", async ({ page }) => {
		const box = page.locator(".m3-checkbox").nth(1);
		const input = page.locator(".m3-checkbox__input").nth(1);
		// 初始 null → indeterminate
		await expect(input).toHaveJSProperty("indeterminate", true);
		await box.click(); // null → false
		await expect(input).not.toBeChecked();
		await expect(input).toHaveJSProperty("indeterminate", false);
		await box.click(); // false → true
		await expect(input).toBeChecked();
		await box.click(); // true → null
		await expect(input).toHaveJSProperty("indeterminate", true);
	});
});

test.describe("SegmentedButton 键盘单选", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-p3-test");
	});

	test("方向键在单选段间移动", async ({ page }) => {
		const radios = page.locator(".m3-segmented__input");
		await expect(radios).toHaveCount(3);
		await radios.nth(0).focus();
		await page.keyboard.press("ArrowRight");
		await expect(page.locator("body")).toContainText("segmented：B");
		await page.keyboard.press("ArrowRight");
		await expect(page.locator("body")).toContainText("segmented：C");
		await page.keyboard.press("ArrowLeft");
		await expect(page.locator("body")).toContainText("segmented：B");
	});
});

test.describe("SegmentedButton 多选键盘", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-rest-test");
	});

	test("Space 切换勾选", async ({ page }) => {
		const seg = page.locator(".m3-segmented").first();
		await expect(page.locator("body")).toContainText("多选（svelte）");
		const input = seg.locator(".m3-segmented__input").nth(2); // Astro
		await input.focus();
		await page.keyboard.press("Space");
		await expect(page.locator("body")).toContainText("多选（svelte、astro）");
		await page.keyboard.press("Space");
		await expect(page.locator("body")).toContainText("多选（svelte）");
	});
});

test.describe("Switch 键盘交互", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-switch-split-test");
	});

	test("Space 切换开关", async ({ page }) => {
		const wifi = page.getByRole("checkbox", { name: "Wi-Fi" });
		await expect(wifi).toBeChecked();
		await wifi.focus();
		await page.keyboard.press("Space");
		await expect(wifi).not.toBeChecked();
		await expect(page.locator("body")).toContainText("wifi：关");
		await page.keyboard.press("Space");
		await expect(wifi).toBeChecked();
	});

	test("disabled 开关不可交互", async ({ page }) => {
		const sw = page.getByRole("checkbox", { name: "禁用" });
		await expect(sw).toBeDisabled();
		await expect(sw).toBeChecked();
		await page.keyboard.press("Space");
		await expect(sw).toBeChecked();
	});
});

test.describe("Card 键盘交互", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-card-test");
	});

	test("Enter / Space 触发可点击卡片", async ({ page }) => {
		const card = page.locator(".m3-card--interactive").first();
		await card.focus();
		await page.keyboard.press("Enter");
		await expect(page.locator("body")).toContainText("累计点击 1 次");
		await page.keyboard.press("Space");
		await expect(page.locator("body")).toContainText("累计点击 2 次");
	});

	test("禁用卡片不可交互", async ({ page }) => {
		await expect(page.locator(".m3-card--interactive").nth(3)).toBeDisabled();
	});
});

test.describe("ToggleButton / ButtonGroup 键盘交互", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-buttongroup-test");
	});

	test("ToggleButton 键盘 Enter 切换", async ({ page }) => {
		const tb = page.getByRole("button", { name: "filled", exact: true });
		await tb.focus();
		await page.keyboard.press("Enter");
		await expect(tb).toHaveAttribute("aria-pressed", "true");
		await expect(page.locator("body")).toContainText("A开");
		await page.keyboard.press("Enter");
		await expect(tb).toHaveAttribute("aria-pressed", "false");
	});

	test("ButtonGroup 单选键盘 Enter", async ({ page }) => {
		const group = page.locator(".m3-button-group").first();
		const item = group.getByRole("button", { name: "文章" });
		await item.focus();
		await page.keyboard.press("Enter");
		await expect(page.locator("body")).toContainText("单选：文章");
	});

	test("溢出项经「更多」菜单键盘可访问", async ({ page }) => {
		const overflow = page.locator(".m3-button-group__overflow").first();
		const more = overflow.getByRole("button", { name: "更多选项" });
		await expect(more).toBeVisible();
		await more.focus();
		await page.keyboard.press("Enter");
		const menu = overflow.locator(".m3-menu");
		await expect(menu).not.toHaveClass(/closed/);
		const firstItem = menu.locator(".m3-menu-item").first();
		const text = (await firstItem.textContent())?.trim() ?? "";
		await firstItem.click();
		await expect(page.locator("body")).toContainText(`溢出单选：${text}`);
	});
});

test.describe("NavigationBar 键盘交互", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-navbar-divider-test");
	});

	test("Enter 切换选中", async ({ page }) => {
		const bar = page.locator(".m3-nav-bar");
		const item = bar.getByRole("button", { name: "搜索" });
		await item.focus();
		await page.keyboard.press("Enter");
		await expect(bar.locator(".m3-nav-bar__item--active")).toContainText(
			"搜索",
		);
		await expect(page.locator("body")).toContainText("当前：搜索");
	});
});

test.describe("ListItem 键盘交互", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-list-toolbar-sheet-test");
	});

	test("Enter / Space 切换选中", async ({ page }) => {
		const item = page.getByRole("button", { name: /可点击 \+ 选中/ });
		await item.focus();
		await page.keyboard.press("Enter");
		await expect(item).toHaveAttribute("aria-pressed", "true");
		await expect(item).toHaveClass(/m3-list-item--selected/);
		const other = page.getByRole("button", { name: /另一个可选项/ });
		await other.focus();
		await page.keyboard.press("Space");
		await expect(other).toHaveAttribute("aria-pressed", "true");
		await expect(item).not.toHaveClass(/m3-list-item--selected/);
	});
});

test.describe("FloatingToolbar 键盘交互", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-list-toolbar-sheet-test");
	});

	test("收起态键盘展开", async ({ page }) => {
		await page.getByRole("button", { name: "切换", exact: true }).click();
		const toolbar = page.locator(".m3-toolbar");
		await expect(toolbar).toHaveClass(/m3-toolbar--collapsed/);
		const expand = page.getByRole("button", { name: "展开工具栏" });
		await expand.focus();
		await page.keyboard.press("Enter");
		await expect(toolbar).toHaveClass(/m3-toolbar--expanded/);
	});

	test("展开态图标按钮可聚焦", async ({ page }) => {
		const toolbar = page.locator(".m3-toolbar");
		const copy = toolbar.getByRole("button", { name: "复制" });
		await copy.focus();
		await expect(copy).toBeFocused();
	});
});

test.describe("BottomSheet 交互深度", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-list-toolbar-sheet-test");
	});

	test("遮罩点击关闭", async ({ page }) => {
		await page.getByRole("button", { name: "打开底部弹层" }).click();
		const sheet = page.locator(".m3-sheet");
		await expect(sheet).toBeVisible();
		await page
			.locator(".m3-sheet__scrim")
			.click({ position: { x: 100, y: 100 } });
		await expect(sheet).toBeHidden();
	});
});

test.describe("Menu 交互深度", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-menu-test");
	});

	test("Esc 关闭菜单", async ({ page }) => {
		await page.getByRole("button", { name: "导出菜单" }).click();
		await page.waitForTimeout(350);
		const menu = page.locator('.m3-menu[aria-label="导出"]');
		await expect(menu).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(menu).toHaveClass(/closed/);
	});

	test("点击外部关闭菜单", async ({ page }) => {
		await page.getByRole("button", { name: "导出菜单" }).click();
		await page.waitForTimeout(350);
		const menu = page.locator('.m3-menu[aria-label="导出"]');
		await expect(menu).toBeVisible();
		await page.mouse.click(1200, 800);
		await expect(menu).toHaveClass(/closed/);
	});

	test("互斥单开：打开 B 自动关闭 A", async ({ page }) => {
		await page.getByRole("button", { name: "导出菜单" }).click();
		await page.waitForTimeout(350);
		const menuA = page.locator('.m3-menu[aria-label="导出"]');
		await expect(menuA).toBeVisible();
		await page.getByRole("button", { name: "分享菜单" }).click();
		await page.waitForTimeout(350);
		const menuB = page.locator('.m3-menu[aria-label="分享"]');
		await expect(menuB).toBeVisible();
		await expect(menuA).toHaveClass(/closed/);
	});
});

test.describe("ExposedDropdownMenu 交互深度", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-rest-test");
	});

	test("aria-expanded 切换 + Esc 关闭", async ({ page }) => {
		const dropdown = page.locator(".m3-dropdown");
		const trigger = dropdown.getByRole("button", { name: "深色" });
		await expect(trigger).toHaveAttribute("aria-expanded", "false");
		await trigger.click();
		await expect(trigger).toHaveAttribute("aria-expanded", "true");
		await expect(dropdown.locator('[role="listbox"]')).toBeVisible();
		await page.keyboard.press("Escape");
		await expect(trigger).toHaveAttribute("aria-expanded", "false");
	});

	test("点击外部关闭", async ({ page }) => {
		const dropdown = page.locator(".m3-dropdown");
		await dropdown.getByRole("button", { name: "深色" }).click();
		await expect(dropdown.locator('[role="listbox"]')).toBeVisible();
		await page.getByRole("heading", { name: /TextField/ }).click();
		await expect(dropdown.locator('[role="listbox"]')).toBeHidden();
	});

	test("键盘 Enter 选择选项", async ({ page }) => {
		const dropdown = page.locator(".m3-dropdown");
		await dropdown.getByRole("button", { name: "深色" }).click();
		const option = dropdown.getByRole("option", { name: "浅色" });
		await option.focus();
		await page.keyboard.press("Enter");
		await expect(dropdown.getByRole("button", { name: "浅色" })).toBeVisible();
		await expect(dropdown.locator('[role="listbox"]')).toBeHidden();
	});
});

test.describe("DatePicker 键盘交互", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-rest-test");
	});

	test("Enter 选择日期", async ({ page }) => {
		const picker = page.locator(".m3-date-picker");
		const day = picker.locator('.m3-date-picker__day[aria-label="2026-08-20"]');
		await day.focus();
		await page.keyboard.press("Enter");
		await expect(day).toHaveAttribute("aria-pressed", "true");
		await expect(page.locator("body")).toContainText("选中：2026-08-20");
	});

	test("月份导航按钮键盘操作", async ({ page }) => {
		const picker = page.locator(".m3-date-picker");
		const next = picker.getByRole("button", { name: "下个月" });
		await next.focus();
		await page.keyboard.press("Enter");
		await expect(picker.locator(".m3-date-picker__month")).toHaveText(
			"2026年9月",
		);
	});
});

test.describe("DateRangePicker 键盘交互", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-rest-test");
	});

	test("键盘选择范围并高亮中间", async ({ page }) => {
		const picker = page.locator(".m3-date-range-picker");
		const day = (iso: string) =>
			picker.locator(`.m3-date-picker__day[aria-label="${iso}"]`);
		await day("2026-08-06").focus();
		await page.keyboard.press("Enter");
		await day("2026-08-10").focus();
		await page.keyboard.press("Enter");
		await expect(page.locator("body")).toContainText(
			"范围：2026-08-06 ~ 2026-08-10",
		);
		await expect(
			picker.locator(".m3-date-range-picker__day-wrap--mid").first(),
		).toBeVisible();
	});

	test("反向选择自动交换", async ({ page }) => {
		const picker = page.locator(".m3-date-range-picker");
		const day = (iso: string) =>
			picker.locator(`.m3-date-picker__day[aria-label="${iso}"]`);
		await day("2026-08-10").click();
		await day("2026-08-06").click();
		await expect(page.locator("body")).toContainText(
			"范围：2026-08-06 ~ 2026-08-10",
		);
	});
});

test.describe("TextField 键盘深度", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-rest-test");
	});

	test("聚焦后 label 浮动", async ({ page }) => {
		const field = page.getByRole("textbox", { name: "用户名" });
		await field.focus();
		await expect(page.locator(".m3-text-field__label").first()).toHaveClass(
			/--float/,
		);
		await field.fill("shirone");
		await expect(page.locator(".m3-text-field__label").first()).toHaveClass(
			/--float/,
		);
	});
});

test.describe("TimePicker 键盘交互", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-timepicker-test");
	});

	test("键盘切换输入模式，输入小时自动跳分钟", async ({ page }) => {
		const picker = page.locator(".m3-time-picker").first();
		const modeBtn = picker.getByRole("button", { name: "切换为键盘输入" });
		await modeBtn.focus();
		await page.keyboard.press("Enter");
		const hour = picker.getByRole("textbox", { name: "小时" });
		const minute = picker.getByRole("textbox", { name: "分钟" });
		await expect(hour).toBeVisible();
		await hour.fill("09");
		await expect(minute).toBeFocused();
		await minute.fill("15");
		await expect(page.locator("body")).toContainText("09:15");
	});

	test("非法小时显示错误态", async ({ page }) => {
		const picker = page.locator(".m3-time-picker").first();
		await picker.getByRole("button", { name: "切换为键盘输入" }).click();
		const hour = picker.getByRole("textbox", { name: "小时" });
		await hour.fill("99");
		await expect(hour).toHaveClass(/m3-time-picker__input--error/);
	});
});

test.describe("SearchBar 键盘深度", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-searchbar-test");
	});

	test("Esc 收起并失焦", async ({ page }) => {
		const bar = page.locator(".m3-search-bar").nth(1);
		const input = bar.locator(".m3-search-bar__input");
		await bar.locator(".m3-search-bar__field").click();
		await input.fill("主题");
		await expect(bar).toHaveClass(/m3-search-bar--expanded/);
		await input.press("Escape");
		await expect(bar).not.toHaveClass(/m3-search-bar--expanded/);
		await expect(input).not.toBeFocused();
	});

	test("ArrowDown 将焦点移入建议列表", async ({ page }) => {
		const bar = page.locator(".m3-search-bar").nth(1);
		const input = bar.locator(".m3-search-bar__input");
		await bar.locator(".m3-search-bar__field").click();
		await input.fill("主题");
		await input.press("ArrowDown");
		const first = bar.locator(".m3-search-suggestion").first();
		await expect(first).toBeFocused();
	});
});

test.describe("Snackbar 交互深度", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-p3-test");
	});

	test("无操作时自动消失", async ({ page }) => {
		await page.getByRole("button", { name: "基础" }).click();
		const snackbar = page.locator(".m3-snackbar");
		await expect(snackbar).toHaveClass(/visible/);
		await expect(snackbar).not.toHaveClass(/visible/, { timeout: 6000 });
	});
});

test.describe("Tooltip 键盘可达", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-p3-test");
	});

	test("键盘聚焦显示提示 + aria-describedby", async ({ page }) => {
		const anchor = page.getByRole("button", { name: /复制/ });
		await anchor.focus();
		const tip = page.locator(".m3-tooltip").filter({ hasText: "复制代码" });
		await expect(tip).toHaveClass(/m3-tooltip--open/);
		await expect(anchor).toHaveAttribute("aria-describedby", /m3e-tooltip-/);
		await page.keyboard.press("Tab");
		await expect(tip).not.toHaveClass(/m3-tooltip--open/);
	});
});

test.describe("SplitButton 键盘交互", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-switch-split-test");
	});

	test("Enter 触发主操作", async ({ page }) => {
		const leading = page.getByRole("button", { name: "导出", exact: true });
		await leading.focus();
		await page.keyboard.press("Enter");
		await expect(page.locator("body")).toContainText("操作：主操作");
	});

	test("Enter 展开 trailing 菜单，Esc 关闭", async ({ page }) => {
		const trailing = page.locator(".m3-split-button__trailing").first();
		await trailing.focus();
		await page.keyboard.press("Enter");
		const split = page.locator(".m3-split-button").first();
		await expect(split).toHaveClass(/m3-split-button--open/);
		await expect(
			page.getByRole("button", { name: "导出为 JSON" }),
		).toBeVisible();
		await page.waitForTimeout(100);
		await page.keyboard.press("Escape");
		await expect(split).not.toHaveClass(/m3-split-button--open/);
	});
});

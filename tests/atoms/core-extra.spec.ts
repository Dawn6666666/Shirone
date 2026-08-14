import { test, expect } from "@playwright/test";
import { openTestPage, expectMatchesToken, expectStyle, readBox, readStyle } from "../helpers/atoms";

/**
 * Menu 官方对照（md-comp-menu）
 * 关键：点击触发按钮展开；菜单 surface-container；项 44px；点击项后关闭。
 */
test.describe("Menu", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-menu-test");
	});

	test("点击触发按钮展开菜单，点击项后关闭", async ({ page }) => {
		await page.getByRole("button", { name: "导出菜单" }).click();
		await page.waitForTimeout(350); // 等待展开动画
		await expect(page.getByRole("button", { name: /下载 JSON/ })).toBeVisible();
		await expectMatchesToken(page, ".m3-menu", "background-color", "--surface-container");
		const itemBox = await readBox(page, ".m3-menu-item");
		// 菜单项高度 44（避开布局中的主题切换菜单项，用实际菜单项验证）
		const jsonBtn = page.getByRole("button", { name: /下载 JSON/ });
		const h = Math.round((await jsonBtn.boundingBox())?.height ?? 0);
		expect(h).toBe(44);
		await jsonBtn.click();
		// 菜单项点击后关闭：容器加 .closed（菜单项保留在 DOM，仅容器隐藏）
		await expect(page.locator('.m3-menu[aria-label="导出"]')).toHaveClass(/closed/);
	});
});

/**
 * AppBar 官方对照（md-comp-top-app-bar-small/center-aligned/medium/large）
 * 关键：small 64 / center 64 / medium 112 / large 152；标题与 nav/actions 插槽。
 */
test.describe("AppBar", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-appbar-test");
	});

	test("渲染标题与 nav/actions 插槽", async ({ page }) => {
		await expect(page.locator(".m3-appbar").first()).toBeVisible();
		await expect(page.locator(".m3-appbar__title").first()).toBeVisible();
		await expect(page.locator(".m3-appbar__nav").first()).toBeVisible();
		await expect(page.locator(".m3-appbar__actions").first()).toBeVisible();
	});

	test("variant 高度：small 64 / center 64 / medium 112 / large 152", async ({ page }) => {
		const bars = page.locator(".m3-appbar");
		const count = await bars.count();
		const heights: Record<string, number> = {};
		for (let i = 0; i < count; i++) {
			const el = bars.nth(i);
			const cls = (await el.getAttribute("class")) ?? "";
			const h = Math.round((await el.boundingBox())?.height ?? 0);
			if (cls.includes("--small")) heights.small = h;
			else if (cls.includes("--center")) heights.center = h;
			else if (cls.includes("--medium")) heights.medium = h;
			else if (cls.includes("--large")) heights.large = h;
		}
		if (heights.small) expect(heights.small).toBe(64);
		if (heights.center) expect(heights.center).toBe(64);
		if (heights.medium) expect(heights.medium).toBe(112);
		if (heights.large) expect(heights.large).toBe(152);
	});
});

/**
 * Card 官方对照（md-comp-card / outlined-card / elevated-card）
 * 关键：filled surface-container-highest；elevated surface-container-low + 阴影；outlined surface + outline-variant 描边。
 */
test.describe("Card", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-card-test");
	});

	test("三种变体容器色符合 token", async ({ page }) => {
		await expectMatchesToken(page, ".m3-card", "background-color", "--surface-container-highest");
		await expectMatchesToken(page, ".m3-card--elevated", "background-color", "--surface-container-low");
		await expectMatchesToken(page, ".m3-card--outlined", "background-color", "--surface");
		await expectMatchesToken(page, ".m3-card--outlined", "border-top-color", "--outline-variant");
	});

	test("radius 覆盖圆角（默认 12px / l 16px / 任意长度）", async ({ page }) => {
		// 默认 corner-medium 12px
		await expectStyle(page, ".m3-card", "border-radius", "12px");
		// radius="l" → corner-large 16px
		const l = page.locator(".m3-card[style*='m3-card-radius']").first();
		await expect(l).toHaveCSS("border-radius", "16px");
	});

	test("可点击卡片触发回调", async ({ page }) => {
		const clickable = page.locator(".m3-card--interactive").first();
		await clickable.click();
		await expect(page.locator("body")).toContainText(/点击/);
	});
});

/**
 * Progress 官方对照（ProgressIndicator：linear determinate/indeterminate + wavy 变体）
 * 关键：determinate 渲染进度条；indeterminate 轨道元素带动画；wavy 轨道存在。
 */
test.describe("Progress", () => {
	test("linear determinate 渲染进度条", async ({ page }) => {
		await openTestPage(page, "atoms-progress-nav-test");
		await expect(page.locator(".m3-progress--linear").first()).toBeVisible();
	});

	test("indeterminate 轨道元素带动画", async ({ page }) => {
		await openTestPage(page, "atoms-progress-nav-test");
		const ind = page.locator(".m3-progress--indeterminate").first();
		await expect(ind).toBeVisible();
		const animCount = await ind.evaluate((el) =>
			[...el.querySelectorAll(".m3-progress__line")].filter((l) => getComputedStyle(l).animationName !== "none").length,
		);
		expect(animCount).toBeGreaterThan(0);
	});

	test("wavy 变体渲染轨道", async ({ page }) => {
		await openTestPage(page, "atoms-progress-wavy-test");
		await expect(page.locator(".m3-progress--wavy").first()).toBeVisible();
		await expect(page.locator(".m3-progress__wavy-track").first()).toBeVisible();
	});
});

/**
 * TimePicker 官方对照（md-comp-time-input / dial）
 * 关键：h24/h12；时分段与冒号；h12 含上午/下午切换；点击时段进入编辑。
 */
test.describe("TimePicker", () => {
	test.beforeEach(async ({ page }) => {
		await openTestPage(page, "atoms-timepicker-test");
	});

	test("渲染时分段与冒号分隔", async ({ page }) => {
		const picker = page.locator(".m3-time-picker").first();
		await expect(picker).toBeVisible();
		await expect(picker.locator(".m3-time-picker__segment")).toHaveCount(2);
		await expect(picker.locator(".m3-time-picker__colon")).toBeVisible();
	});

	test("h12 格式含上午/下午切换", async ({ page }) => {
		const h12 = page.locator(".m3-time-picker").nth(1);
		await expect(h12).toContainText(/上午|下午/);
	});

	test("点击时段编辑并回填", async ({ page }) => {
		const picker = page.locator(".m3-time-picker").first();
		const seg = picker.locator(".m3-time-picker__segment").first();
		await seg.click();
		await expect(seg).toHaveClass(/--active/);
	});
	test("拨盘：选小时自动切分钟，选分钟后回填", async ({ page }) => {
		const picker = page.locator(".m3-time-picker").first();
		await picker.getByRole("button", { name: "15 点" }).click();
		await expect(picker.getByRole("button", { name: "45 分" })).toBeVisible();
		await picker.getByRole("button", { name: "45 分" }).click();
		await expect(page.locator("body")).toContainText("15:45");
	});

	test("h12 拨盘：下午切换 07:05 → 19:05", async ({ page }) => {
		const picker = page.locator(".m3-time-picker").nth(1);
		await picker.getByRole("button", { name: "下午" }).click();
		await expect(page.locator("body")).toContainText("19:05");
	});

	test("切换输入模式并键入时间回填", async ({ page }) => {
		const picker = page.locator(".m3-time-picker").first();
		await picker.getByRole("button", { name: "切换为键盘输入" }).click();
		await picker.getByRole("textbox", { name: "小时" }).fill("09");
		await picker.getByRole("textbox", { name: "分钟" }).fill("15");
		await expect(page.locator("body")).toContainText("09:15");
	});

});

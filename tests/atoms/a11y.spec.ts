import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { openTestPage } from "../helpers/atoms";

/**
 * A11y lock spec (axe-core / WCAG 2.1 AA)
 * Scans every atoms test page in light and dark mode; no violations allowed.
 * page-has-heading-one is excluded: it is a page-level rule of the demo harness,
 * not part of the component library contract.
 */
const pages = [
	"atoms-appbar-test",
	"atoms-autocomplete-test",
	"atoms-badgedbox-test",
	"atoms-banner-test",
	"atoms-blog-test",
	"atoms-buttongroup-test",
	"atoms-button-test",
	"atoms-card-test",
	"atoms-carousel-pull-test",
	"atoms-chips-test",
	"atoms-datatable-test",
	"atoms-display-test",
	"atoms-fabmenu-test",
	"atoms-fab-test",
	"atoms-iconbutton-test",
	"atoms-list-toolbar-sheet-test",
	"atoms-loading-date-test",
	"atoms-menu-test",
	"atoms-navbar-divider-test",
	"atoms-p3-test",
	"atoms-progress-nav-test",
	"atoms-progress-wavy-test",
	"atoms-radio-slider-test",
	"atoms-rail-drawer-test",
	"atoms-rest-test",
	"atoms-searchbar-test",
	"atoms-searchview-test",
	"atoms-select-test",
	"atoms-sheetside-test",
	"atoms-switch-split-test",
	"atoms-tabs-test",
	"atoms-timepicker-test",
];

const DISABLED_RULES = ["page-has-heading-one"];

const modes = [
	{ name: "light", theme: "light", dark: false },
	{ name: "dark", theme: "dark", dark: true },
];

for (const mode of modes) {
	test.describe(`A11y scan lock (${mode.name})`, () => {
		for (const slug of pages) {
			test(slug, async ({ page }) => {
				await page.addInitScript(
					(t) => localStorage.setItem("theme", t),
					mode.theme,
				);
				await openTestPage(page, slug);
				// 防止主题未应用导致“假通过”：确认页面确实处于目标模式
				const isDark = await page.evaluate(() =>
					document.documentElement.classList.contains("dark"),
				);
				expect(isDark, `${slug} theme should be ${mode.name}`).toBe(mode.dark);
				const results = await new AxeBuilder({ page })
					.disableRules(DISABLED_RULES)
					.analyze();
				const summary = results.violations.map((v) => ({
					id: v.id,
					impact: v.impact,
					nodes: v.nodes.map((n) => n.target.join(" ")),
				}));
				expect(
					summary,
					`${slug} has accessibility violations (${mode.name})`,
				).toEqual([]);
			});
		}
	});
}

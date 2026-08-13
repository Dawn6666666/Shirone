import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { openTestPage } from "../helpers/atoms";

/**
 * A11y lock spec (axe-core / WCAG 2.1 AA)
 * Scans every atoms test page; no violations allowed.
 * page-has-heading-one is excluded: it is a page-level rule of the demo harness,
 * not part of the component library contract.
 */
const pages = [
	"atoms-appbar-test",
	"atoms-autocomplete-test",
	"atoms-badgedbox-test",
	"atoms-banner-test",
	"atoms-buttongroup-test",
	"atoms-button-test",
	"atoms-card-test",
	"atoms-carousel-pull-test",
	"atoms-chips-test",
	"atoms-datatable-test",
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

test.describe("A11y scan lock", () => {
	for (const slug of pages) {
		test(slug, async ({ page }) => {
			await openTestPage(page, slug);
			const results = await new AxeBuilder({ page })
				.disableRules(DISABLED_RULES)
				.analyze();
			const summary = results.violations.map((v) => ({
				id: v.id,
				impact: v.impact,
				nodes: v.nodes.map((n) => n.target.join(" ")),
			}));
			expect(summary, `${slug} has accessibility violations`).toEqual([]);
		});
	}
});

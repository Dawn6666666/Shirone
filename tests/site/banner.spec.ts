import { expect, test } from "@playwright/test";

const BANNER_ASSET = /\/assets\/banner\//;

async function waitForBannerState(
	page: import("@playwright/test").Page,
	visible: boolean,
) {
	await page.waitForFunction(
		(expected) => document.body.dataset.bannerVisible === String(expected),
		visible,
	);
}

async function expectBannerOverlap(page: import("@playwright/test").Page) {
	const geometry = await page.evaluate(() => {
		const banner = document.getElementById("banner-wrapper");
		const categoryBar = document.getElementById("category-bar-region");
		if (!banner || !categoryBar) return null;

		const rootStyle = getComputedStyle(document.documentElement);
		const resolveLength = (property: string): number => {
			let value = rootStyle.getPropertyValue(property).trim();
			const variable = value.match(/^var\((--[^,)]+)/);
			if (variable) value = rootStyle.getPropertyValue(variable[1]).trim();
			const numericValue = Number.parseFloat(value);
			return value.endsWith("rem")
				? numericValue * Number.parseFloat(rootStyle.fontSize)
				: numericValue;
		};

		return {
			actual:
				banner.getBoundingClientRect().bottom -
				categoryBar.getBoundingClientRect().top,
			expected: resolveLength("--banner-panel-overlap"),
		};
	});

	expect(geometry).not.toBeNull();
	expect(geometry?.actual).toBeCloseTo(geometry?.expected ?? 0, 0);
}

async function expectWaveGeometry(
	page: import("@playwright/test").Page,
	expectedScale: string,
) {
	const geometry = await page.locator(".banner-waves").evaluate((waves) => {
		const rootStyle = getComputedStyle(document.documentElement);
		const layer = waves.querySelector<HTMLElement>(".banner-waves__layer");
		if (!layer) return null;
		const overlapProperty = rootStyle
			.getPropertyValue("--banner-panel-overlap")
			.trim();
		const overlapVariable = overlapProperty.match(/^var\((--[^,)]+)/);
		const overlapValue = overlapVariable
			? rootStyle.getPropertyValue(overlapVariable[1]).trim()
			: overlapProperty;
		const overlap = Number.parseFloat(overlapValue);
		return {
			height: waves.getBoundingClientRect().height,
			overlap: overlapValue.endsWith("rem")
				? overlap * Number.parseFloat(rootStyle.fontSize)
				: overlap,
			scale: getComputedStyle(layer)
				.getPropertyValue("--banner-wave-scale-y")
				.trim(),
		};
	});

	expect(geometry).not.toBeNull();
	expect(geometry?.height).toBeGreaterThan(geometry?.overlap ?? 0);
	expect(Number(geometry?.scale)).toBe(Number(expectedScale));
}

async function expectWavesAnimated(
	page: import("@playwright/test").Page,
	animated: boolean,
) {
	await expect(page.locator(".banner-waves")).toBeVisible();
	const animationCount = await page
		.locator(".banner-waves")
		.evaluate((waves) => waves.getAnimations({ subtree: true }).length);
	expect(animationCount > 0).toBe(animated);
}

async function expectRouteProgressAtAppBarBottom(
	page: import("@playwright/test").Page,
) {
	const rootSize = await page.evaluate(() =>
		Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
	);
	await expect(page.locator(".route-progress")).toHaveCSS(
		"top",
		`${rootSize * 4}px`,
	);
}

async function expectCompactTop(page: import("@playwright/test").Page) {
	const rootSize = await page.evaluate(() =>
		Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
	);
	await expect(page.locator("#main-layout")).toHaveCSS(
		"top",
		`${rootSize * 5.5}px`,
	);
}

test.describe("banner wallpaper", () => {
	test("desktop loads only desktop images and renders home copy", async ({
		page,
	}) => {
		const requests: string[] = [];
		page.on("request", (request) => {
			if (BANNER_ASSET.test(request.url())) requests.push(request.url());
		});

		await page.goto("/", { waitUntil: "domcontentloaded" });
		await waitForBannerState(page, true);
		await expect(page.locator("#banner-wrapper h1")).toHaveText("Shirone");
		await expect(page.locator("#banner-wrapper p")).toHaveText(
			"A Material 3 anime blog",
		);
		await expect(page.locator("#navbar")).toHaveClass(
			/top-app-bar--transparent/,
		);
		await expect(page.locator(".route-progress")).toHaveCSS("top", "0px");
		await expect(page.locator(".banner-waves__layer")).toHaveCount(4);
		await expectWavesAnimated(page, true);
		await expectBannerOverlap(page);
		await expectWaveGeometry(page, "1");
		await expect(page.locator("#main-layout")).toHaveCSS(
			"top",
			/^[4-9]\d{2}(\.\d+)?px$/,
		);
		expect(requests.some((request) => request.includes("/desktop/"))).toBe(
			true,
		);
		expect(requests.some((request) => request.includes("/mobile/"))).toBe(
			false,
		);
	});

	test("desktop progress moves below the app bar after leaving the Banner", async ({
		page,
	}) => {
		await page.goto("/", { waitUntil: "domcontentloaded" });
		await waitForBannerState(page, true);
		await expect(page.locator(".route-progress")).toHaveCSS("top", "0px");

		await page.evaluate(() => window.scrollTo(0, window.innerHeight));
		await page.waitForFunction(
			() => document.body.dataset.bannerScrolled === "true",
		);
		await expect(page.locator("#navbar")).not.toHaveClass(
			/top-app-bar--transparent/,
		);
		await expectRouteProgressAtAppBarBottom(page);
	});

	test("mobile post hides wallpaper and keeps compact content geometry", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 390, height: 844 });
		const requests: string[] = [];
		page.on("request", (request) => {
			if (BANNER_ASSET.test(request.url())) requests.push(request.url());
		});

		await page.goto("/posts/guide/", { waitUntil: "domcontentloaded" });
		await waitForBannerState(page, false);
		await expect(page.locator("#banner-wrapper")).toBeHidden();
		await expect(page.locator(".banner-waves")).toBeHidden();
		await expectCompactTop(page);
		await expect(page.locator("#navbar")).not.toHaveClass(
			/top-app-bar--transparent/,
		);
		await expectRouteProgressAtAppBarBottom(page);
		expect(requests).toEqual([]);
	});

	test("mobile home loads only mobile image resources", async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		const requests: string[] = [];
		page.on("request", (request) => {
			if (BANNER_ASSET.test(request.url())) requests.push(request.url());
		});

		await page.goto("/", { waitUntil: "domcontentloaded" });
		await waitForBannerState(page, true);
		await expectWavesAnimated(page, true);
		await expectBannerOverlap(page);
		await expectWaveGeometry(page, "0.72");
		expect(requests.some((request) => request.includes("/mobile/"))).toBe(true);
		expect(requests.some((request) => request.includes("/desktop/"))).toBe(
			false,
		);
	});

	test("tablet home keeps the full wave geometry at the desktop breakpoint", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 768, height: 900 });
		await page.goto("/", { waitUntil: "domcontentloaded" });
		await waitForBannerState(page, true);
		await expectWavesAnimated(page, true);
		await expectBannerOverlap(page);
		await expectWaveGeometry(page, "1");
	});

	test("solid preference persists and avoids all banner requests", async ({
		page,
	}) => {
		await page.addInitScript(() =>
			localStorage.setItem("wallpaper-mode", "none"),
		);
		const requests: string[] = [];
		page.on("request", (request) => {
			if (BANNER_ASSET.test(request.url())) requests.push(request.url());
		});

		await page.goto("/", { waitUntil: "domcontentloaded" });
		await waitForBannerState(page, false);
		await expect(page.locator("#banner-wrapper")).toBeHidden();
		await expect(page.locator(".banner-waves")).toBeHidden();
		await expectCompactTop(page);
		expect(requests).toEqual([]);
	});

	test("display settings switches modes immediately and persists", async ({
		page,
	}) => {
		await page.goto("/", { waitUntil: "domcontentloaded" });
		await waitForBannerState(page, true);
		await page.locator("#display-settings-switch").click();
		await page.getByText("Solid", { exact: true }).click();
		await waitForBannerState(page, false);
		expect(
			await page.evaluate(() => localStorage.getItem("wallpaper-mode")),
		).toBe("none");
		await expectCompactTop(page);

		await page.reload({ waitUntil: "domcontentloaded" });
		await waitForBannerState(page, false);
		await page.locator("#display-settings-switch").click();
		await page.getByText("Banner", { exact: true }).click();
		await waitForBannerState(page, true);
	});

	test("automatic carousel crossfades to the next desktop image", async ({
		page,
	}) => {
		await page.goto("/", { waitUntil: "domcontentloaded" });
		await waitForBannerState(page, true);
		const desktopImageCount = await page
			.locator("#banner-wrapper")
			.evaluate((stage) => {
				const value = (stage as HTMLElement).dataset.desktopImages;
				return value ? JSON.parse(value).length : 0;
			});
		test.skip(
			desktopImageCount < 2,
			"carousel requires at least two desktop images",
		);
		const before = await page
			.locator(".banner-stage__image--active")
			.getAttribute("src");
		await page.waitForFunction(
			(initial) =>
				document
					.querySelector<HTMLImageElement>(".banner-stage__image--active")
					?.getAttribute("src") !== initial,
			before,
			{ timeout: 7500 },
		);
		const after = await page
			.locator(".banner-stage__image--active")
			.getAttribute("src");
		expect(after).not.toBe(before);
	});

	test("reduced motion keeps the initial slide static", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.goto("/", { waitUntil: "domcontentloaded" });
		await waitForBannerState(page, true);
		await expectWavesAnimated(page, false);
		const before = await page
			.locator(".banner-stage__image--active")
			.getAttribute("src");
		await page.waitForTimeout(6500);
		const after = await page
			.locator(".banner-stage__image--active")
			.getAttribute("src");
		expect(after).toBe(before);
	});

	test("manual reduced motion keeps the wave boundary static", async ({
		page,
	}) => {
		await page.addInitScript(() =>
			localStorage.setItem("mc-motion", "reduced"),
		);
		await page.goto("/", { waitUntil: "domcontentloaded" });
		await waitForBannerState(page, true);
		await expect(page.locator("html")).toHaveClass(/motion-reduced/);
		await expectWavesAnimated(page, false);
	});

	test("Swup home to post removes mobile wallpaper without leaving a gap", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto("/", { waitUntil: "networkidle" });
		await waitForBannerState(page, true);
		await expect(page.locator(".banner-waves")).toHaveCount(1);

		await page.evaluate(() => {
			(
				document.querySelector(
					'#swup-container a[href^="/posts/"]',
				) as HTMLAnchorElement
			)?.click();
		});
		await page.waitForFunction(
			() =>
				document.getElementById("swup-container")?.dataset.currentPage ===
				"post",
		);
		await waitForBannerState(page, false);
		await expect(page.locator(".banner-waves")).toHaveCount(1);
		await expect(page.locator(".banner-waves")).toBeHidden();
		await expectCompactTop(page);
	});
});

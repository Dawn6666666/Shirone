import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const POST_PATH = "/posts/markdown-extended/";
const DEMO_PATH = "/posts/markdown-mermaid/";

test.describe("Mermaid diagrams", () => {
	test("preserves an SSR fallback and renders a themed SVG", async ({
		page,
		request,
	}) => {
		const response = await request.get(POST_PATH);
		expect(response.ok()).toBe(true);
		const html = await response.text();
		expect(html).toContain('data-mermaid-state="pending"');
		expect(html).toContain("Markdown rendering pipeline");

		await page.goto(POST_PATH, { waitUntil: "domcontentloaded" });
		const diagram = page.locator(".markdown-mermaid");
		await expect(diagram).toHaveAttribute("data-mermaid-state", "ready", {
			timeout: 15_000,
		});
		await expect(diagram.locator("[data-mermaid-svg]")).toHaveCount(1);
		await expect(diagram.locator("svg title")).toHaveText(
			"Markdown rendering pipeline",
		);
		await expect(diagram.locator(".markdown-mermaid__fallback")).toBeHidden();
		expect(
			(await new AxeBuilder({ page }).include(".markdown-mermaid").analyze())
				.violations,
		).toEqual([]);

		const firstTheme = await diagram.getAttribute("data-mermaid-theme");
		await page.evaluate(() =>
			document.documentElement.classList.toggle("dark"),
		);
		await expect
			.poll(() => diagram.getAttribute("data-mermaid-theme"))
			.not.toBe(firstTheme);
		expect(
			(await new AxeBuilder({ page }).include(".markdown-mermaid").analyze())
				.violations,
		).toEqual([]);
	});

	test("stays within the article on mobile", async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto(POST_PATH, { waitUntil: "domcontentloaded" });
		const diagram = page.locator(".markdown-mermaid");
		await expect(diagram).toHaveAttribute("data-mermaid-state", "ready", {
			timeout: 15_000,
		});

		const bounds = await diagram.evaluate((element) => {
			const rect = element.getBoundingClientRect();
			return { left: rect.left, right: rect.right, viewport: innerWidth };
		});
		expect(bounds.left).toBeGreaterThanOrEqual(0);
		expect(bounds.right).toBeLessThanOrEqual(bounds.viewport + 1);
	});

	test("renders after Swup replaces the article content", async ({ page }) => {
		await page.goto("/posts/guide/", { waitUntil: "domcontentloaded" });
		await page.waitForFunction(() => Boolean(window.swup?.hooks));
		await page.evaluate((path) => window.swup?.navigate(path), POST_PATH);
		await page.waitForURL(`**${POST_PATH}`);

		const diagram = page.locator(".markdown-mermaid");
		await expect(diagram).toHaveAttribute("data-mermaid-state", "ready", {
			timeout: 15_000,
		});
		await expect(diagram.locator("[data-mermaid-svg]")).toHaveCount(1);
	});

	test("renders every diagram in the dedicated demo article", async ({
		page,
	}) => {
		await page.goto(DEMO_PATH, { waitUntil: "domcontentloaded" });
		const diagrams = page.locator(".markdown-mermaid");
		await expect(diagrams).toHaveCount(14);
		await expect
			.poll(
				() =>
					diagrams.evaluateAll(
						(elements) =>
							elements.filter(
								(element) => element.dataset.mermaidState === "ready",
							).length,
					),
				{ timeout: 30_000 },
			)
			.toBe(14);
		await expect(diagrams.locator("[data-mermaid-svg]")).toHaveCount(14);
		const regions = diagrams.locator(
			'.markdown-mermaid__diagram[role="region"]',
		);
		await expect(regions).toHaveCount(14);
		expect(
			await regions.evaluateAll((elements) =>
				elements.every(
					(element) =>
						Boolean(element.getAttribute("aria-label")) ||
						Boolean(element.getAttribute("aria-labelledby")),
				),
			),
		).toBe(true);
		expect(
			(await new AxeBuilder({ page }).include(".markdown-mermaid").analyze())
				.violations,
		).toEqual([]);
	});
});

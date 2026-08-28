import type { Page, Request } from "@playwright/test";
import { expect, test } from "@playwright/test";

const PLAIN_POST_PATH = "/posts/admonitions/";
const RICH_POST_PATH = "/posts/mdx-showcase/";

const optionalRuntimeModules = {
	katex: /\/src\/utils\/katex-scroll\.ts(?:\?|$)/,
	mermaid: /\/src\/utils\/mermaid\.ts(?:\?|$)/,
};

function trackOptionalRuntimeRequests(page: Page): string[] {
	const requests: string[] = [];
	page.on("request", (request: Request) => {
		const url = request.url();
		if (
			Object.values(optionalRuntimeModules).some((pattern) => pattern.test(url))
		) {
			requests.push(url);
		}
	});
	return requests;
}

test.describe("Markdown syntax runtime loading", () => {
	test("defers math and Mermaid modules until a Swup target uses them", async ({
		page,
	}) => {
		const requests = trackOptionalRuntimeRequests(page);

		await page.goto(PLAIN_POST_PATH, { waitUntil: "networkidle" });
		await page.waitForFunction(() => Boolean(window.swup?.navigate));
		expect(requests).toEqual([]);

		await page.evaluate((path) => window.swup?.navigate(path), RICH_POST_PATH);
		await page.waitForURL(`**${RICH_POST_PATH}`);
		await expect(page.locator(".markdown-mermaid").first()).toHaveAttribute(
			"data-mermaid-state",
			"ready",
			{ timeout: 15_000 },
		);
		const formula = page.locator(".katex-display").first();
		await formula.scrollIntoViewIfNeeded();
		await expect(formula).toHaveAttribute(
			"data-scrollbar-initialized",
			"true",
			{ timeout: 15_000 },
		);

		expect(
			requests.some((url) => optionalRuntimeModules.mermaid.test(url)),
		).toBe(true);
		expect(requests.some((url) => optionalRuntimeModules.katex.test(url))).toBe(
			true,
		);
	});
});

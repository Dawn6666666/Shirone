/** Prepare deterministic state for Lighthouse runs. */
module.exports = async function prepareLighthouse(browser) {
	const pages = await browser.pages();
	const page = pages[0];
	if (!page) return;

	await page.evaluateOnNewDocument(() => {
		const params = new URLSearchParams(window.location.search);
		if (params.get("post-list-mode") === "grid") {
			window.localStorage.setItem("post-list-mode", "grid");
		}
		if (!window.localStorage.getItem("theme")) {
			window.localStorage.setItem("theme", "light");
		}
	});

	await page.waitForFunction(
		() => {
			const root = document.documentElement;
			const animations = [...document.querySelectorAll(".onload-animation")];
			return (
				root.style.getPropertyValue("--mc-primary").trim().startsWith("#") &&
				animations.every((element) => {
					if (element.offsetParent === null) return true;
					return getComputedStyle(element).opacity === "1";
				})
			);
		},
		{ timeout: 15_000 },
	).catch(() => undefined);
};

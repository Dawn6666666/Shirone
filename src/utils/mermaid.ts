const DIAGRAM_SELECTOR = ".markdown-mermaid[data-mermaid]";
const THEME_PROPERTIES = [
	"--mc-primary",
	"--mc-on-primary-container",
	"--mc-primary-container",
	"--mc-secondary",
	"--mc-on-secondary-container",
	"--mc-secondary-container",
	"--mc-tertiary",
	"--mc-on-tertiary-container",
	"--mc-tertiary-container",
	"--mc-surface",
	"--mc-surface-container-low",
	"--mc-surface-container-lowest",
	"--mc-on-surface",
	"--mc-on-surface-variant",
	"--mc-outline-variant",
] as const;

let initialized = false;
let renderTimer: number | undefined;
let renderSequence = 0;
let rendering = false;
let rerenderRequested = false;
let lastThemeSignature = "";
let swupBound = false;

function readTheme() {
	const root = document.documentElement;
	const styles = getComputedStyle(root);
	const values = Object.fromEntries(
		THEME_PROPERTIES.map((property) => [
			property,
			styles.getPropertyValue(property).trim(),
		]),
	);
	const signature = [
		root.classList.contains("dark") ? "dark" : "light",
		...THEME_PROPERTIES.map((property) => values[property]),
	].join("|");

	return { values, signature };
}

function createThemeVariables(values: Record<string, string>) {
	return {
		fontFamily: getComputedStyle(document.body).fontFamily,
		background: values["--mc-surface"],
		primaryColor: values["--mc-primary-container"],
		primaryTextColor: values["--mc-on-primary-container"],
		primaryBorderColor: values["--mc-primary"],
		secondaryColor: values["--mc-secondary-container"],
		secondaryTextColor: values["--mc-on-secondary-container"],
		secondaryBorderColor: values["--mc-secondary"],
		tertiaryColor: values["--mc-tertiary-container"],
		tertiaryTextColor: values["--mc-on-tertiary-container"],
		tertiaryBorderColor: values["--mc-tertiary"],
		lineColor: values["--mc-on-surface-variant"],
		textColor: values["--mc-on-surface"],
		mainBkg: values["--mc-primary-container"],
		clusterBkg: values["--mc-surface-container-low"],
		clusterBorder: values["--mc-outline-variant"],
		edgeLabelBackground: values["--mc-surface-container-lowest"],
	};
}

function parseSvg(svg: string): SVGElement {
	const documentNode = new DOMParser().parseFromString(svg, "image/svg+xml");
	if (documentNode.querySelector("parsererror")) {
		throw new Error("Mermaid returned invalid SVG markup");
	}

	const svgElement = documentNode.documentElement;
	if (svgElement.tagName.toLowerCase() !== "svg") {
		throw new Error("Mermaid did not return an SVG element");
	}

	svgElement.removeAttribute("height");
	svgElement.style.removeProperty("max-width");
	const viewBox = svgElement.getAttribute("viewBox")?.split(/\s+/).map(Number);
	if (viewBox?.length === 4 && Number.isFinite(viewBox[2])) {
		svgElement.style.width = `${Math.ceil(viewBox[2])}px`;
	}
	svgElement.setAttribute("data-mermaid-svg", "");

	return document.importNode(svgElement, true) as unknown as SVGElement;
}

function readDiagramSource(diagram: HTMLElement): string {
	const fallback = diagram.querySelector<HTMLElement>(
		".markdown-mermaid__fallback",
	)?.textContent;
	if (fallback) return fallback;

	return Array.from(
		diagram.querySelectorAll<HTMLElement>(".expressive-code .ec-line > .code"),
	)
		.map((line) => line.textContent ?? "")
		.join("\n");
}

function findDiagramHeading(diagram: HTMLElement): HTMLElement | null {
	let sibling = diagram.previousElementSibling;
	while (sibling) {
		if (/^H[1-6]$/.test(sibling.tagName)) return sibling as HTMLElement;
		sibling = sibling.previousElementSibling;
	}
	return null;
}

async function renderDiagrams() {
	if (rendering) {
		rerenderRequested = true;
		return;
	}

	const diagrams = Array.from(
		document.querySelectorAll<HTMLElement>(DIAGRAM_SELECTOR),
	);
	if (diagrams.length === 0) return;

	const theme = readTheme();
	const targets = diagrams.filter(
		(diagram) => diagram.dataset.mermaidTheme !== theme.signature,
	);
	if (targets.length === 0) return;

	rendering = true;
	try {
		const { default: mermaid } = await import("mermaid");
		mermaid.initialize({
			startOnLoad: false,
			securityLevel: "strict",
			suppressErrorRendering: true,
			theme: "base",
			themeVariables: createThemeVariables(theme.values),
		});

		for (const diagram of targets) {
			const source = readDiagramSource(diagram);
			const output = diagram.querySelector<HTMLElement>(
				".markdown-mermaid__diagram",
			);
			if (!source || !output) {
				diagram.dataset.mermaidState = "error";
				console.error(
					"Failed to render Mermaid diagram: source is unavailable",
				);
				continue;
			}

			diagram.dataset.mermaidState = "loading";
			try {
				const id = `shirone-mermaid-${++renderSequence}`;
				const { svg } = await mermaid.render(id, source);
				if (!diagram.isConnected || readTheme().signature !== theme.signature) {
					rerenderRequested = true;
					continue;
				}

				const svgElement = parseSvg(svg);
				const title = svgElement.querySelector("title")?.textContent?.trim();
				output.tabIndex = 0;
				output.setAttribute("role", "region");
				if (title) {
					output.setAttribute("aria-label", title);
					output.removeAttribute("aria-labelledby");
				} else {
					const heading = findDiagramHeading(diagram);
					if (heading?.id) {
						output.setAttribute("aria-labelledby", heading.id);
						output.removeAttribute("aria-label");
					}
				}
				output.querySelector("[data-mermaid-svg]")?.remove();
				output.append(svgElement);
				diagram.dataset.mermaidTheme = theme.signature;
				diagram.dataset.mermaidState = "ready";
			} catch (error) {
				diagram.dataset.mermaidState = "error";
				console.error("Failed to render Mermaid diagram", error);
			}
		}
	} finally {
		rendering = false;
		if (rerenderRequested) {
			rerenderRequested = false;
			scheduleMermaidRender();
		}
	}
}

export function scheduleMermaidRender() {
	window.clearTimeout(renderTimer);
	renderTimer = window.setTimeout(() => void renderDiagrams());
}

export function initMermaidDiagrams() {
	if (initialized) return;
	initialized = true;
	lastThemeSignature = readTheme().signature;

	const themeObserver = new MutationObserver(() => {
		const nextSignature = readTheme().signature;
		if (nextSignature === lastThemeSignature) return;
		lastThemeSignature = nextSignature;
		scheduleMermaidRender();
	});
	themeObserver.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ["class", "style"],
	});

	const bindSwup = () => {
		if (!window.swup?.hooks || swupBound) return;
		swupBound = true;
		window.swup.hooks.on("content:replace", scheduleMermaidRender);
	};
	if (window.swup?.hooks) {
		bindSwup();
	} else {
		document.addEventListener("swup:enable", bindSwup, { once: true });
	}
	scheduleMermaidRender();
}

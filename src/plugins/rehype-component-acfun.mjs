import { h } from "hastscript";
import { getAcFunEmbedData } from "./markdown/core/acfun.mjs";

/**
 * Renders a static AcFun facade. The player is only created after the
 * browser-side runtime receives an explicit activation.
 */
export function AcFunComponent(properties, children) {
	if (Array.isArray(children) && children.length !== 0) return null;

	const embed = getAcFunEmbedData(properties);
	if (!embed) return null;
	const { acid, title, poster } = embed;

	const stageChildren = [];
	if (poster) {
		stageChildren.push(
			h("img", {
				class: "m3-acfun__poster",
				src: poster,
				alt: "",
				loading: "lazy",
				decoding: "async",
				referrerPolicy: "no-referrer",
			}),
		);
	}

	stageChildren.push(
		h(
			"button",
			{
				class: "m3-acfun__play m3-state-layer",
				type: "button",
				dataAcfunActivate: true,
				ariaLabel: title,
			},
			[h("span", { class: "m3-acfun__play-icon", "aria-hidden": "true" })],
		),
	);

	return h(
		"figure",
		{
			class: "m3-acfun not-prose",
			dataAcfun: true,
			dataAcfunAcid: acid,
			dataAcfunTitle: title,
		},
		[
			h("div", { class: "m3-acfun__stage" }, stageChildren),
			h("figcaption", { class: "m3-acfun__caption" }, [
				h("strong", { class: "m3-acfun__title" }, title),
				h(
					"a",
					{
						class: "m3-acfun__source m3-state-layer",
						href: `https://www.acfun.cn/v/${acid}`,
						target: "_blank",
						rel: "noopener noreferrer",
					},
					"AcFun",
				),
			]),
		],
	);
}

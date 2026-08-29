import { h } from "hastscript";
import { getBilibiliEmbedData } from "./markdown/core/bilibili.mjs";

/**
 * Renders a static Bilibili facade. The player is only created after the
 * browser-side runtime receives an explicit activation.
 */
export function BilibiliComponent(properties, children) {
	if (Array.isArray(children) && children.length !== 0) return null;

	const embed = getBilibiliEmbedData(properties);
	if (!embed) return null;
	const { bvid, title, part, poster } = embed;

	const videoUrl = new URL(`https://www.bilibili.com/video/${bvid}/`);
	videoUrl.searchParams.set("p", String(part));
	const stageChildren = [];
	if (poster) {
		stageChildren.push(
			h("img", {
				class: "m3-bilibili__poster",
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
				class: "m3-bilibili__play m3-state-layer",
				type: "button",
				dataBilibiliActivate: true,
				ariaLabel: title,
			},
			[h("span", { class: "m3-bilibili__play-icon", "aria-hidden": "true" })],
		),
	);

	return h(
		"figure",
		{
			class: "m3-bilibili not-prose",
			dataBilibili: true,
			dataBilibiliBvid: bvid,
			dataBilibiliPart: String(part),
			dataBilibiliTitle: title,
		},
		[
			h("div", { class: "m3-bilibili__stage" }, stageChildren),
			h("figcaption", { class: "m3-bilibili__caption" }, [
				h("strong", { class: "m3-bilibili__title" }, title),
				h(
					"a",
					{
						class: "m3-bilibili__source m3-state-layer",
						href: videoUrl.toString(),
						target: "_blank",
						rel: "noopener noreferrer",
					},
					"Bilibili",
				),
			]),
		],
	);
}

export const BILIBILI_BVID_PATTERN = /^BV[1-9A-HJ-NP-Za-km-z]{10}$/;

const POSITIVE_INTEGER_PATTERN = /^[1-9]\d*$/;

function getText(value) {
	return typeof value === "string" ? value.trim() : "";
}

function getPart(value) {
	const part = getText(value);
	if (!part) return 1;
	if (!POSITIVE_INTEGER_PATTERN.test(part)) return null;

	const parsedPart = Number.parseInt(part, 10);
	return Number.isSafeInteger(parsedPart) ? parsedPart : null;
}

function getSafePoster(value) {
	const poster = getText(value);
	if (!poster) return "";
	if (poster.startsWith("/") && !poster.startsWith("//")) return poster;

	try {
		return new URL(poster).protocol === "https:" ? poster : null;
	} catch {
		return null;
	}
}

/** Normalizes the only author-controlled fields accepted by the facade. */
export function getBilibiliEmbedData(attributes = {}) {
	const bvid = getText(attributes.bvid);
	const title = getText(attributes.title);
	const part = getPart(attributes.p);
	const poster = getSafePoster(attributes.poster);
	if (
		!BILIBILI_BVID_PATTERN.test(bvid) ||
		!title ||
		part === null ||
		poster === null
	) {
		return null;
	}

	return { bvid, title, part, poster };
}

/** Produces the sole provider URL permitted after an explicit user action. */
export function getBilibiliPlayerUrl(bvid, part) {
	if (!BILIBILI_BVID_PATTERN.test(bvid)) return null;
	if (!POSITIVE_INTEGER_PATTERN.test(String(part))) return null;

	const parsedPart = Number.parseInt(String(part), 10);
	if (!Number.isSafeInteger(parsedPart)) return null;

	const url = new URL("https://player.bilibili.com/player.html");
	url.searchParams.set("bvid", bvid);
	url.searchParams.set("p", String(parsedPart));
	url.searchParams.set("high_quality", "1");
	url.searchParams.set("danmaku", "0");
	return url.toString();
}

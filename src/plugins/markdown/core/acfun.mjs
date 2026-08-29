export const ACFUN_VIDEO_ID_PATTERN = /^ac[1-9]\d*$/i;

function getText(value) {
	return typeof value === "string" ? value.trim() : "";
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
export function getAcFunEmbedData(attributes = {}) {
	const rawAcid = getText(attributes.acid);
	const acid = rawAcid.toLowerCase();
	const title = getText(attributes.title);
	const poster = getSafePoster(attributes.poster);
	if (!ACFUN_VIDEO_ID_PATTERN.test(acid) || !title || poster === null) {
		return null;
	}

	return { acid, title, poster };
}

/** Produces the sole provider URL permitted after an explicit user action. */
export function getAcFunPlayerUrl(acid) {
	const normalizedAcid = getText(acid).toLowerCase();
	if (!ACFUN_VIDEO_ID_PATTERN.test(normalizedAcid)) return null;

	return `https://www.acfun.cn/player/${normalizedAcid}`;
}

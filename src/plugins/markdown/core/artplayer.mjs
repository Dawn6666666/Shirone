function getText(value) {
	return typeof value === "string" ? value.trim() : "";
}

function getSafeUrl(value) {
	const url = getText(value);
	if (!url) return null;
	if (url.startsWith("/") && !url.startsWith("//")) return url;

	try {
		return new URL(url).protocol === "https:" ? url : null;
	} catch {
		return null;
	}
}

function getSafePoster(value) {
	const poster = getText(value);
	if (!poster) return "";
	return getSafeUrl(poster);
}

/** Normalizes the only author-controlled fields accepted by native video. */
export function getArtPlayerEmbedData(attributes = {}) {
	const src = getSafeUrl(attributes.src);
	const title = getText(attributes.title);
	const poster = getSafePoster(attributes.poster);
	if (!src || !title || poster === null) return null;

	return { src, title, poster };
}

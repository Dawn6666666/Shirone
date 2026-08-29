export const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

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
export function getYouTubeEmbedData(attributes = {}) {
	const id = getText(attributes.id);
	const title = getText(attributes.title);
	const poster = getSafePoster(attributes.poster);
	if (!YOUTUBE_VIDEO_ID_PATTERN.test(id) || !title || poster === null) {
		return null;
	}

	return { id, title, poster };
}

/** Produces the sole provider URL permitted after an explicit user action. */
export function getYouTubePlayerUrl(id) {
	if (!YOUTUBE_VIDEO_ID_PATTERN.test(id)) return null;

	const url = new URL(`https://www.youtube-nocookie.com/embed/${id}`);
	url.searchParams.set("rel", "0");
	url.searchParams.set("modestbranding", "1");
	return url.toString();
}

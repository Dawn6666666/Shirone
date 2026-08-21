import type {
	MusicConfig,
	PlaybackMode,
	TrackDescriptor,
} from "@/types/musicConfig";

/**
 * 侧栏音乐配置单一真源。默认关闭且不附带示例媒体，禁用时不产生额外负担。
 */
export const musicConfig: MusicConfig = {
	enable: true,
	tracks: [
		{
			id: "dazbee",
			title: "口笛で愛は歌えない",
			artist: "Dazbee",
			cover: "/assets/music/cover/dazbee.webp",
			source: "/assets/music/url/dazbee.mp3",
			duration: 241,
		},
		{
			id: "hitori",
			title: "ひとり上手",
			artist: "Kaya",
			cover: "/assets/music/cover/hitori.webp",
			source: "/assets/music/url/hitori.mp3",
			duration: 253,
		},
		{
			id: "xryx",
			title: "眩耀夜行",
			artist: "スリーズブーケ",
			cover: "/assets/music/cover/xryx.webp",
			source: "/assets/music/url/xryx.mp3",
			duration: 245,
		},
		{
			id: "cl",
			title: "春雷の頃",
			artist: "22/7",
			cover: "/assets/music/cover/cl.webp",
			source: "/assets/music/url/cl.mp3",
			duration: 242,
		},
	],
	defaultVolume: 0.7,
	defaultMode: "sequence",
};

export interface ResolvedMusicOptions {
	readonly playlist: readonly TrackDescriptor[];
	readonly defaultVolume: number;
	readonly defaultMode: PlaybackMode;
}

const ABSOLUTE_MEDIA_SOURCE = /^(?:https?:)?\/\//i;
const UNSAFE_SCHEME = /^[a-z][a-z\d+.-]*:/i;

function normalizeMediaSource(value: string): string | null {
	const source = value.trim();
	if (!source) return null;
	if (ABSOLUTE_MEDIA_SOURCE.test(source) || source.startsWith("/")) {
		return source;
	}
	if (UNSAFE_SCHEME.test(source)) return null;
	return `/${source.replace(/^\.\//, "")}`;
}

function normalizeTrack(
	track: TrackDescriptor,
	usedIds: Set<string>,
): TrackDescriptor | null {
	const id = track.id.trim();
	const title = track.title.trim();
	const source = normalizeMediaSource(track.source);
	if (!id || !title || !source || usedIds.has(id)) return null;

	usedIds.add(id);
	const artist = track.artist?.trim() || undefined;
	const cover = track.cover
		? (normalizeMediaSource(track.cover) ?? undefined)
		: undefined;
	const duration =
		typeof track.duration === "number" &&
		Number.isFinite(track.duration) &&
		track.duration > 0
			? track.duration
			: undefined;

	return Object.freeze({ id, title, source, artist, cover, duration });
}

export function clampMusicVolume(value: number, fallback = 0.7): number {
	if (!Number.isFinite(value)) return fallback;
	return Math.min(1, Math.max(0, value));
}

export function resolveMusicOptions(
	config: MusicConfig,
): ResolvedMusicOptions | null {
	if (!config.enable) return null;

	const usedIds = new Set<string>();
	const playlist = config.tracks
		.map((track) => normalizeTrack(track, usedIds))
		.filter((track): track is TrackDescriptor => track !== null);
	if (playlist.length === 0) return null;

	return Object.freeze({
		playlist: Object.freeze(playlist),
		defaultVolume: clampMusicVolume(config.defaultVolume),
		defaultMode: config.defaultMode,
	});
}

import { musicTracks } from "@/data/music";
import type {
	MusicConfig,
	MusicProvider,
	PlaybackMode,
	TrackDescriptor,
} from "@/types/musicConfig";

/**
 * 侧栏音乐配置单一真源。
 * 遵循「零额外负担」原则：本地曲目数据已抽离至 src/data/music.ts，
 * 此处仅保留全局开关、播放器默认行为及预留的数据源模式切换接口。
 */
export const musicConfig: MusicConfig = {
	enable: true,
	provider: "local",
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

	const provider: MusicProvider = config.provider ?? "local";

	let rawTracks: readonly TrackDescriptor[] = [];
	if (provider === "local") {
		rawTracks = config.tracks ?? musicTracks;
	} else if (provider === "custom" && config.tracks) {
		rawTracks = config.tracks;
	}
	// 预留 meting 等远端 API 接入解析

	const usedIds = new Set<string>();
	const playlist = rawTracks
		.map((track) => normalizeTrack(track, usedIds))
		.filter((track): track is TrackDescriptor => track !== null);
	if (playlist.length === 0) return null;

	return Object.freeze({
		playlist: Object.freeze(playlist),
		defaultVolume: clampMusicVolume(config.defaultVolume),
		defaultMode: config.defaultMode,
	});
}

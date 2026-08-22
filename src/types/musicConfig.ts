export type PlaybackMode = "sequence" | "repeat-one" | "shuffle";

export type MusicProvider = "local" | "meting" | "custom";

export type MusicErrorCode =
	| "empty-playlist"
	| "source-unavailable"
	| "autoplay-blocked"
	| "invalid-track";

export type MusicStatus =
	| "idle"
	| "loading"
	| "ready"
	| "playing"
	| "paused"
	| "error";

export interface TrackDescriptor {
	readonly id: string;
	readonly title: string;
	readonly artist?: string;
	readonly source: string;
	readonly cover?: string;
	readonly duration?: number;
}

export interface MetingMusicConfig {
	readonly server?: "netease" | "tencent" | "kugou" | "xiami" | "baidu";
	readonly type?: "playlist" | "song" | "album" | "artist";
	readonly id?: string;
	readonly api?: string;
}

export interface MusicConfig {
	/** 是否全局启用音乐功能 */
	readonly enable: boolean;
	/** 音频数据源模式：local（本地曲目） | meting（Meting API / 远端歌单） | custom（自定义列表） */
	readonly provider?: MusicProvider;
	/** 本地播放列表覆盖（未显式提供且 provider 为 local 时默认使用 src/data/music.ts） */
	readonly tracks?: readonly TrackDescriptor[];
	/** Meting 等远端 API 预留配置 */
	readonly meting?: MetingMusicConfig;
	/** 初始音量，范围 0–1 */
	readonly defaultVolume: number;
	/** 初始播放模式 */
	readonly defaultMode: PlaybackMode;
}

export interface MusicSnapshot {
	readonly playlist: readonly TrackDescriptor[];
	readonly currentIndex: number;
	readonly currentTrack: TrackDescriptor | null;
	readonly status: MusicStatus;
	readonly currentTime: number;
	readonly duration: number;
	readonly volume: number;
	readonly muted: boolean;
	readonly mode: PlaybackMode;
	readonly error: MusicErrorCode | null;
}

export interface MusicRuntime {
	initialize(): Promise<void>;
	getSnapshot(): MusicSnapshot;
	subscribe(listener: (snapshot: MusicSnapshot) => void): () => void;
	play(): Promise<void>;
	pause(): void;
	toggle(): Promise<void>;
	select(index: number): Promise<void>;
	next(): Promise<void>;
	previous(): Promise<void>;
	seek(seconds: number): void;
	setVolume(value: number): void;
	setMuted(value: boolean): void;
	setMode(mode: PlaybackMode): void;
	destroy(): void;
}

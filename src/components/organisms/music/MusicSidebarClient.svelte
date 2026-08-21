<script lang="ts">
import IconButton from "@components/atoms/action/IconButton.svelte";
import Tooltip from "@components/atoms/overlay/Tooltip.svelte";
import Icon from "@iconify/svelte";
import { collapse } from "@utils/motion";
import { onMount } from "svelte";
import type { ResolvedMusicOptions } from "@/config/musicConfig";
import type {
	MusicErrorCode,
	MusicRuntime,
	MusicSnapshot,
	PlaybackMode,
} from "@/types/musicConfig";

interface Labels {
	previous: string;
	play: string;
	pause: string;
	next: string;
	mute: string;
	unmute: string;
	playbackMode: string;
	modeSequence: string;
	modeRepeatOne: string;
	modeShuffle: string;
	progress: string;
	volume: string;
	showPlaylist: string;
	hidePlaylist: string;
	empty: string;
	loading: string;
	nowPlaying: string;
	errors: Record<MusicErrorCode, string>;
}

interface Props {
	options: ResolvedMusicOptions;
	labels: Labels;
}

let { options, labels }: Props = $props();
let runtime = $state<MusicRuntime | null>(null);
let snapshot = $state<MusicSnapshot>({
	playlist: options.playlist,
	currentIndex: options.playlist.length > 0 ? 0 : -1,
	currentTrack: options.playlist[0] ?? null,
	status: "idle",
	currentTime: 0,
	duration: options.playlist[0]?.duration ?? 0,
	volume: options.defaultVolume,
	muted: false,
	mode: options.defaultMode,
	error: options.playlist.length > 0 ? null : "empty-playlist",
});
let playlistOpen = $state(false);
const playlistId = "sidebar-music-playlist";

const modeLabels: Record<PlaybackMode, string> = {
	sequence: labels.modeSequence,
	"repeat-one": labels.modeRepeatOne,
	shuffle: labels.modeShuffle,
};
const modeIcons: Record<PlaybackMode, string> = {
	sequence: "material-symbols:repeat-rounded",
	"repeat-one": "material-symbols:repeat-one-rounded",
	shuffle: "material-symbols:shuffle-rounded",
};

const playing = $derived(snapshot.status === "playing");
const modeLabel = $derived(modeLabels[snapshot.mode]);
const modeIcon = $derived(modeIcons[snapshot.mode]);
const duration = $derived(Math.max(0, snapshot.duration));
const progressMax = $derived(duration > 0 ? duration : 1);
const displayTime = $derived(formatTime(snapshot.currentTime));
const displayDuration = $derived(formatTime(duration));
const progressLabel = $derived(
	labels.progress
		.replace("{current}", displayTime)
		.replace("{duration}", displayDuration),
);
const volumeLabel = $derived(
	labels.volume.replace("{volume}", String(Math.round(snapshot.volume * 100))),
);
const liveMessage = $derived.by(() => {
	if (snapshot.error) return labels.errors[snapshot.error];
	if (snapshot.status === "loading") return labels.loading;
	if (snapshot.currentTrack && snapshot.status === "playing") {
		return labels.nowPlaying.replace("{title}", snapshot.currentTrack.title);
	}
	return "";
});

onMount(() => {
	let unsubscribe = () => {};
	let active = true;
	void import("@utils/music").then(({ getMusicRuntime }) => {
		if (!active) return;
		runtime = getMusicRuntime(options);
		unsubscribe = runtime.subscribe((next) => {
			snapshot = next;
		});
		void runtime.initialize();
	});
	return () => {
		active = false;
		unsubscribe();
	};
});

function formatTime(value: number): string {
	if (!Number.isFinite(value) || value < 0) return "0:00";
	const seconds = Math.floor(value);
	return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function cycleMode(): void {
	const modes: PlaybackMode[] = ["sequence", "repeat-one", "shuffle"];
	const index = modes.indexOf(snapshot.mode);
	runtime?.setMode(modes[(index + 1) % modes.length]);
}

function seek(event: Event): void {
	runtime?.seek(Number((event.currentTarget as HTMLInputElement).value));
}

function setVolume(event: Event): void {
	runtime?.setVolume(Number((event.currentTarget as HTMLInputElement).value));
}
</script>

<div class="music-player" data-music-player>
	{#if snapshot.currentTrack}
		<div class="music-player__track">
			<div class={`music-player__cover${playing ? " music-player__cover--playing" : ""}`}>
				{#if snapshot.currentTrack.cover}
					<img
						src={snapshot.currentTrack.cover}
						alt=""
						loading="lazy"
						decoding="async"
					/>
				{:else}
					<Icon icon="material-symbols:music-note-rounded" aria-hidden="true" />
				{/if}
			</div>
			<div class="music-player__metadata">
				<strong title={snapshot.currentTrack.title}>{snapshot.currentTrack.title}</strong>
				{#if snapshot.currentTrack.artist}
					<span title={snapshot.currentTrack.artist}>{snapshot.currentTrack.artist}</span>
				{/if}
			</div>
			<time class="music-player__time">{displayTime}</time>
		</div>

		<div class="music-player__progress">
			<input
				type="range"
				min="0"
				max={progressMax}
				step="0.1"
				value={Math.min(snapshot.currentTime, progressMax)}
				disabled={duration <= 0}
				aria-label={progressLabel}
				oninput={seek}
			/>
			<div class="music-player__times" aria-hidden="true">
				<span>{displayTime}</span>
				<span>{displayDuration}</span>
			</div>
		</div>

		<div class="music-player__controls">
			<Tooltip label={modeLabel} placement="top">
				<IconButton
					icon={modeIcon}
					label={`${labels.playbackMode}: ${modeLabel}`}
					size="xsmall"
					onclick={cycleMode}
				/>
			</Tooltip>
			<Tooltip label={labels.previous} placement="top">
				<IconButton
					icon="material-symbols:skip-previous-rounded"
					label={labels.previous}
					size="small"
					disabled={snapshot.playlist.length === 0}
					onclick={() => void runtime?.previous()}
				/>
			</Tooltip>
			<Tooltip label={playing ? labels.pause : labels.play} placement="top">
				<IconButton
					icon="material-symbols:play-arrow-rounded"
					checkedIcon="material-symbols:pause-rounded"
					label={playing ? labels.pause : labels.play}
					variant="filled"
					size="medium"
					toggle
					checked={playing}
					disabled={snapshot.playlist.length === 0}
					onclick={() => void runtime?.toggle()}
				/>
			</Tooltip>
			<Tooltip label={labels.next} placement="top">
				<IconButton
					icon="material-symbols:skip-next-rounded"
					label={labels.next}
					size="small"
					disabled={snapshot.playlist.length === 0}
					onclick={() => void runtime?.next()}
				/>
			</Tooltip>
			<Tooltip label={snapshot.muted ? labels.unmute : labels.mute} placement="top">
				<IconButton
					icon="material-symbols:volume-up-rounded"
					checkedIcon="material-symbols:volume-off-rounded"
					label={snapshot.muted ? labels.unmute : labels.mute}
					size="xsmall"
					toggle
					checked={snapshot.muted}
					onclick={() => runtime?.setMuted(!snapshot.muted)}
				/>
			</Tooltip>
		</div>

		<div class="music-player__volume">
			<Icon icon="material-symbols:volume-down-rounded" aria-hidden="true" />
			<input
				type="range"
				min="0"
				max="1"
				step="0.01"
				value={snapshot.volume}
				aria-label={volumeLabel}
				oninput={setVolume}
			/>
			<span aria-hidden="true">{Math.round(snapshot.volume * 100)}%</span>
		</div>

			<button
				type="button"
				class="music-player__playlist-toggle m3-state-layer"
				aria-expanded={playlistOpen}
				aria-controls={playlistId}
				onclick={() => (playlistOpen = !playlistOpen)}
		>
			<Icon icon="material-symbols:queue-music-rounded" aria-hidden="true" />
			<span>{playlistOpen ? labels.hidePlaylist : labels.showPlaylist}</span>
			<Icon
				icon={playlistOpen ? "material-symbols:expand-less-rounded" : "material-symbols:expand-more-rounded"}
				aria-hidden="true"
			/>
		</button>

			<div
				id={playlistId}
				class="music-player__playlist-panel"
				inert={!playlistOpen}
				aria-hidden={!playlistOpen}
				use:collapse={{ open: playlistOpen }}
			>
			<ol class="music-player__playlist">
				{#each snapshot.playlist as track, index (track.id)}
					<li>
						<button
							type="button"
							class={`music-player__playlist-item m3-state-layer${index === snapshot.currentIndex ? " music-player__playlist-item--current" : ""}`}
							aria-current={index === snapshot.currentIndex ? "true" : undefined}
							onclick={() => void runtime?.select(index)}
						>
							<span class="music-player__playlist-index" aria-hidden="true">
								{#if index === snapshot.currentIndex && playing}
									<Icon icon="material-symbols:play-arrow-rounded" />
								{:else}
									{index + 1}
								{/if}
							</span>
							<span class="music-player__playlist-copy">
								<strong>{track.title}</strong>
								{#if track.artist}<span>{track.artist}</span>{/if}
							</span>
							{#if track.duration}
								<time>{formatTime(track.duration)}</time>
							{/if}
						</button>
					</li>
				{/each}
			</ol>
		</div>
	{:else}
		<p class="music-player__empty">{labels.empty}</p>
	{/if}

	{#if snapshot.error}
		<p class="music-player__error">{labels.errors[snapshot.error]}</p>
	{/if}
	<p class="sr-only" aria-live="polite" aria-atomic="true">{liveMessage}</p>
</div>

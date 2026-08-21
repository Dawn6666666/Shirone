import type { Page } from "@playwright/test";
import stylus from "stylus";
import { musicSidebarStylus } from "../../src/components/organisms/music/musicSidebarStyles";

const musicSidebarStyles = new Promise<string>((resolve, reject) => {
	stylus.render(musicSidebarStylus, (error, css) => {
		if (error) reject(error);
		else resolve(css);
	});
});

const labels = {
	previous: "Previous track",
	play: "Play",
	pause: "Pause",
	next: "Next track",
	mute: "Mute",
	unmute: "Unmute",
	playbackMode: "Playback mode",
	modeSequence: "Sequence",
	modeRepeatOne: "Repeat one",
	modeShuffle: "Shuffle",
	progress: "Progress: {current} of {duration}",
	volume: "Volume: {volume}%",
	showPlaylist: "Show playlist",
	hidePlaylist: "Hide playlist",
	empty: "No tracks available",
	loading: "Loading track",
	nowPlaying: "Now playing: {title}",
	errors: {
		"empty-playlist": "No tracks available",
		"source-unavailable": "The track could not be played",
		"autoplay-blocked": "Playback requires interaction",
		"invalid-track": "The selected track is invalid",
	},
};

export async function mountMusicClient(page: Page): Promise<void> {
	await page.goto("/", { waitUntil: "domcontentloaded" });
	await page.waitForFunction(() => {
		return (
			getComputedStyle(document.documentElement)
				.getPropertyValue("--primary")
				.trim().length > 0
		);
	});
	await page.addStyleTag({ content: await musicSidebarStyles });

	await page.evaluate(async (fixtureLabels) => {
		let audioCreations = 0;
		class TestAudio extends EventTarget {
			constructor() {
				super();
				audioCreations += 1;
			}

			preload = "";
			volume = 1;
			muted = false;
			paused = true;
			currentTime = 0;
			duration = 180;
			private source: string | null = null;

			get src(): string {
				return this.source ?? "";
			}

			set src(value: string) {
				this.source = value;
			}

			getAttribute(name: string): string | null {
				return name === "src" ? this.source : null;
			}

			removeAttribute(name: string): void {
				if (name === "src") this.source = null;
			}

			load(): void {
				queueMicrotask(() => {
					this.dispatchEvent(new Event("loadedmetadata"));
				});
			}

			pause(): void {
				if (this.paused) return;
				this.paused = true;
				this.dispatchEvent(new Event("pause"));
			}

			async play(): Promise<void> {
				this.paused = false;
				this.dispatchEvent(new Event("play"));
			}
		}

		Object.defineProperty(window, "Audio", {
			configurable: true,
			value: TestAudio,
		});

		const host = document.createElement("section");
		host.id = "music-client-test-host";
		host.style.cssText =
			"position: fixed; top: 80px; right: 16px; z-index: 2147483647; isolation: isolate; width: 320px; max-height: calc(100vh - 96px); overflow: auto; padding: 16px; background: var(--surface);";
		document.body.prepend(host);

		const { mountMusicClientFixture } = await import(
			"/tests/fixtures/music-client.browser.ts"
		);
		const component = mountMusicClientFixture(host, {
			options: {
				playlist: [
					{
						id: "one",
						title: "First track",
						artist: "First artist",
						source: "/test-media/one.mp3",
						duration: 180,
					},
					{
						id: "two",
						title: "Second track",
						artist: "Second artist",
						source: "/test-media/two.mp3",
						duration: 240,
					},
				],
				defaultVolume: 0.7,
				defaultMode: "sequence",
			},
			labels: fixtureLabels,
		});
		(
			window as typeof window & {
				__musicTestComponent?: unknown;
				__musicAudioCreations?: () => number;
			}
		).__musicTestComponent = component;
		(
			window as typeof window & {
				__musicAudioCreations?: () => number;
			}
		).__musicAudioCreations = () => audioCreations;
	}, labels);

	await page.locator("[data-music-player]").waitFor();
}

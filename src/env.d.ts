/// <reference types="astro/client" />
/// <reference path="../.astro/types.d.ts" />

declare module "virtual:shirone-music-sidebar" {
	const component: typeof import("@components/organisms/music/MusicSidebar.astro").default | null;
	export default component;
}
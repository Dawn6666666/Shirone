import {
	AUTO_MODE,
	DARK_MODE,
	DEFAULT_THEME,
	LIGHT_MODE,
} from "@constants/constants.ts";
import { applyCurrentScheme } from "@utils/theme-utils";
import { expressiveCodeConfig } from "@/config";
import type { LIGHT_DARK_MODE } from "@/types/config";

export function getDefaultHue(): number {
	const fallback = "250";
	const configCarrier = document.getElementById("config-carrier");
	return Number.parseInt(configCarrier?.dataset.hue || fallback, 10);
}

export function getHue(): number {
	const stored = localStorage.getItem("hue");
	return stored ? Number.parseInt(stored, 10) : getDefaultHue();
}

export function setHue(hue: number): void {
	localStorage.setItem("hue", String(hue));
	const r = document.querySelector(":root") as HTMLElement;
	if (!r) {
		return;
	}
	r.style.setProperty("--hue", String(hue));
	applyCurrentScheme();
}

export function applyThemeToDocument(theme: LIGHT_DARK_MODE) {
	switch (theme) {
		case LIGHT_MODE:
			document.documentElement.classList.remove("dark");
			break;
		case DARK_MODE:
			document.documentElement.classList.add("dark");
			break;
		case AUTO_MODE:
			if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
				document.documentElement.classList.add("dark");
			} else {
				document.documentElement.classList.remove("dark");
			}
			break;
	}

	// Set the theme for Expressive Code based on current mode
	// (light/dark code block themes)
	const isDark = document.documentElement.classList.contains("dark");
	document.documentElement.setAttribute(
		"data-theme",
		isDark
			? (expressiveCodeConfig.darkTheme ?? expressiveCodeConfig.theme)
			: (expressiveCodeConfig.lightTheme ?? expressiveCodeConfig.theme),
	);

	// Dark mode affects the resolved M3/M3E scheme
	applyCurrentScheme();
}

export function setTheme(theme: LIGHT_DARK_MODE): void {
	localStorage.setItem("theme", theme);
	applyThemeToDocument(theme);
}

export function getStoredTheme(): LIGHT_DARK_MODE {
	return (localStorage.getItem("theme") as LIGHT_DARK_MODE) || DEFAULT_THEME;
}

const MOTION_KEY = "mc-motion";

/** 是否开启「减少动态效果」（手动覆盖 prefers-reduced-motion） */
export function getMotionPreference(): boolean {
	return localStorage.getItem(MOTION_KEY) === "reduced";
}

export function applyMotionPreference(reduced: boolean): void {
	document.documentElement.classList.toggle("motion-reduced", reduced);
}

export function setMotionPreference(reduced: boolean): void {
	localStorage.setItem(MOTION_KEY, reduced ? "reduced" : "full");
	applyMotionPreference(reduced);
}

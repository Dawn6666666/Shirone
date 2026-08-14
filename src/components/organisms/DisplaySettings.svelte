<script lang="ts">
import SegmentedButton from "@components/atoms/selection/SegmentedButton.svelte";
import Slider from "@components/atoms/selection/Slider.svelte";
import Switch from "@components/atoms/selection/Switch.svelte";
import AccentBar from "@components/atoms/display/AccentBar.svelte";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import Icon from "@iconify/svelte";
import {
	MC_SPECS,
	MC_STYLES,
	type McSpec,
	type McStyle,
	resolveScheme,
} from "@utils/mc-utils";
import {
	getDefaultHue,
	getHue,
	getMotionPreference,
	setHue,
	setMotionPreference,
} from "@utils/setting-utils";
import { getSpec, getStyle, setSpec, setStyle } from "@utils/theme-utils";
import { onMount } from "svelte";
import { getDefaultSpec, getDefaultStyle } from "@/config";

let { class: className = "" }: { class?: string } = $props();

const defaultHue = getDefaultHue();
const defaultStyle = getDefaultStyle() as McStyle;
const defaultSpec = getDefaultSpec() as McSpec;
let hue = $state(getHue());
let style = $state<McStyle>(getStyle());
let spec = $state<McSpec>(getSpec());
let dark = $state(
	typeof document !== "undefined" &&
		document.documentElement.classList.contains("dark"),
);

let motionReduced = $state(false);

// 明暗切换时重算色卡（LightDarkSwitch 改 <html> 的 class）
onMount(() => {
	const observer = new MutationObserver(() => {
		dark = document.documentElement.classList.contains("dark");
	});
	observer.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ["class"],
	});
	motionReduced = getMotionPreference();
	return () => observer.disconnect();
});

/** 完整重置：色相 / 配色风格 / Color Spec 全部还原为站点默认（点击即生效，无确认弹窗） */
function confirmReset() {
	hue = defaultHue;
	style = defaultStyle;
	spec = defaultSpec;
}

/** 是否有可重置的偏离（控制 Reset 按钮可见性） */
const isDirty = $derived(
	hue !== defaultHue || style !== defaultStyle || spec !== defaultSpec,
);

$effect(() => {
	if (hue || hue === 0) setHue(hue);
});
$effect(() => {
	setStyle(style);
});
$effect(() => {
	setSpec(spec);
});
$effect(() => {
	setMotionPreference(motionReduced);
});

function styleKey(s: McStyle): I18nKey {
	switch (s) {
		case "tonalSpot":
			return I18nKey.styleTonalSpot;
		case "vibrant":
			return I18nKey.styleVibrant;
		case "content":
			return I18nKey.styleContent;
		case "expressive":
			return I18nKey.styleExpressive;
		case "rainbow":
			return I18nKey.styleRainbow;
		case "fruitSalad":
			return I18nKey.styleFruitSalad;
		case "monochrome":
			return I18nKey.styleMonochrome;
		case "neutral":
			return I18nKey.styleNeutral;
		case "fidelity":
			return I18nKey.styleFidelity;
	}
}

/** 某个风格在当前色相/明暗/规范下的 primary/secondary/tertiary */
function styleColors(s: McStyle, h: number, d: boolean, sp: McSpec) {
	const scheme = resolveScheme(h, d, s, sp);
	return {
		primary: scheme.primary ?? "#888",
		secondary: scheme.secondary ?? "#888",
		tertiary: scheme.tertiary ?? "#888",
	};
}

/** 当前主色（标题右侧预览圆点） */
const currentColor = $derived(styleColors(style, hue, dark, spec).primary);

/** 9 个风格的色卡预览（3×3 网格） */
const stylePreviews = $derived(
	MC_STYLES.map((s) => ({
		style: s,
		label: i18n(styleKey(s)),
		colors: styleColors(s, hue, dark, spec),
	})),
);
</script>

<div id="display-setting" class="float-panel float-panel-closed absolute transition-all w-80 right-4 px-4 py-4 {className}">
    <div class="flex flex-row gap-2 mb-3 items-center justify-between">
        <div class="flex gap-2 font-bold text-lg text-[var(--on-surface)] transition relative ml-3">
            <AccentBar size="small" class="absolute -left-3 top-[0.33rem]" />
            {i18n(I18nKey.themeColor)}
            <button aria-label="Reset to Default" class="float-control w-7 h-7 rounded-md active:scale-90 will-change-transform flex items-center justify-center"
                    class:opacity-0={!isDirty} class:pointer-events-none={!isDirty} onclick={confirmReset}>
                <Icon icon="fa6-solid:arrow-rotate-left" class="text-[0.875rem]"></Icon>
            </button>
        </div>
        <div class="flex gap-1 items-center">
            <!-- 当前色相值展示（非输入框，避免原生输入框的聚焦/触摸样式） -->
            <div title={i18n(I18nKey.themeColor)}
                 class="h-7 min-w-16 px-1 rounded-(--shape-corner-m) flex items-center justify-center
                        bg-(--surface-container-high) text-sm font-bold text-(--on-surface)">
                {hue}
            </div>
            <!-- 当前主色实时预览 -->
            <div class="h-7 w-7 rounded-full" title={i18n(I18nKey.themeColor)}
                 style={`background: ${currentColor}; box-shadow: inset 0 0 0 1px var(--outline-variant)`}></div>
        </div>
    </div>
    <Slider bind:value={hue} min={0} max={360} step={5} label={i18n(I18nKey.themeColor)} />

    <div class="flex flex-col gap-3 mt-4">
        <span class="text-sm font-bold text-[var(--on-surface-variant)] ml-1">{i18n(I18nKey.colorStyle)}</span>
        <div class="grid grid-cols-3 gap-2" role="radiogroup" aria-label={i18n(I18nKey.colorStyle)}>
            {#each stylePreviews as p (p.style)}
                <button
                    type="button"
                    role="radio"
                    aria-checked={style === p.style}
                    title={p.label}
                    aria-label={p.label}
                    class="m3-style-cell"
                    class:selected={style === p.style}
                    onclick={() => (style = p.style)}
                >
                    <span class="m3-style-cell__dots">
                        <span class="m3-style-cell__dot" style={`background: ${p.colors.primary}`}></span>
                        <span class="m3-style-cell__dot" style={`background: ${p.colors.secondary}`}></span>
                        <span class="m3-style-cell__dot" style={`background: ${p.colors.tertiary}`}></span>
                    </span>
                    <span class="m3-style-cell__name">{p.label}</span>
                </button>
            {/each}
        </div>

        <div class="flex flex-col gap-1.5">
            <span class="text-sm font-bold text-[var(--on-surface-variant)] ml-1">{i18n(I18nKey.colorSpec)}</span>
            <SegmentedButton
                options={MC_SPECS.map((s) => ({
                    value: s,
                    label: s === "2021" ? i18n(I18nKey.spec2021) : i18n(I18nKey.spec2025),
                }))}
                bind:value={spec}
                label={i18n(I18nKey.colorSpec)}
            />
        </div>

        <div class="flex items-center gap-3">
            <span class="text-sm font-bold text-[var(--on-surface-variant)] ml-1">{i18n(I18nKey.reduceMotion)}</span>
            <Switch bind:checked={motionReduced} label={i18n(I18nKey.reduceMotion)} icons />
        </div>
    </div>
</div>


<style lang="stylus">
    .m3-style-cell
        display: flex
        flex-direction: column
        align-items: center
        justify-content: center
        gap: 0.375rem
        padding: 0.5rem 0.25rem
        border: none
        border-radius: var(--shape-corner-s)
        background: transparent
        color: var(--on-surface-variant)
        font: var(--m3e-type-label-small)
        cursor: pointer
        user-select: none
        transition: background-color var(--m3e-duration-short) var(--m3e-easing-standard), color var(--m3e-duration-short) var(--m3e-easing-standard)
        &:hover
            background: unquote("color-mix(in oklab, var(--on-surface) 6%, transparent)")
        &.selected
            background: var(--secondary-container)
            color: var(--on-secondary-container)

        &__dots
            display: flex
            gap: 0.25rem

        &__dot
            width: 0.625rem
            height: 0.625rem
            border-radius: var(--shape-corner-full)
            box-shadow: unquote("inset 0 0 0 1px color-mix(in oklab, var(--on-surface) 20%, transparent)")

        &__name
            max-width: 100%
            overflow: hidden
            text-overflow: ellipsis
            white-space: nowrap

</style>

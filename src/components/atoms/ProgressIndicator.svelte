<script lang="ts">
/**
 * M3E ProgressIndicator — 进度指示原子（官方 ProgressIndicator.kt 移植）。
 * variant: linear（4dp 高轨道）/ circular（40dp 圆环 4dp 厚）。
 * progress: 0-1 定值模式；省略/undefined = indeterminate（动画扫过）。
 * 颜色：active = primary、track = surface-container-highest（官方默认）。
 * 用法：<ProgressIndicator progress={0.6} />
 *      <ProgressIndicator variant="circular" />            ← indeterminate
 *      <ProgressIndicator variant="circular" progress={0.4} />
 */
let {
	variant = "linear",
	progress,
	label = "加载中",
	class: className = "",
}: {
	variant?: "linear" | "circular";
	/** 0-1 定值；undefined = indeterminate */
	progress?: number;
	label?: string;
	class?: string;
} = $props();

const determinate = progress !== undefined && progress >= 0;
const pct = determinate ? Math.max(0, Math.min(100, progress * 100)) : 0;
// 圆环：周长 = 2πr（r = (40 - 4)/2 = 18）
const CIRC = 2 * Math.PI * 18;
</script>

{#if variant === "linear"}
    <div
        class="m3-progress m3-progress--linear {className}"
        class:m3-progress--indeterminate={!determinate}
        role="progressbar"
        aria-label={label}
        aria-valuenow={determinate ? pct : undefined}
        aria-valuemin={determinate ? 0 : undefined}
        aria-valuemax={determinate ? 100 : undefined}
    >
        <div class="m3-progress__track">
            <div class="m3-progress__active" style={determinate ? `width: ${pct}%` : undefined}></div>
        </div>
    </div>
{:else}
    <svg
        class="m3-progress m3-progress--circular {className}"
        class:m3-progress--indeterminate={!determinate}
        role="progressbar"
        aria-label={label}
        aria-valuenow={determinate ? pct : undefined}
        aria-valuemin={determinate ? 0 : undefined}
        aria-valuemax={determinate ? 100 : undefined}
        viewBox="0 0 40 40"
    >
        <circle class="m3-progress__track" cx="20" cy="20" r="18" fill="none" stroke-width="4"></circle>
        <circle
            class="m3-progress__active"
            cx="20"
            cy="20"
            r="18"
            fill="none"
            stroke-width="4"
            stroke-linecap="round"
            stroke-dasharray={determinate ? `${CIRC * progress} ${CIRC}` : `${CIRC * 0.25} ${CIRC}`}
            style={determinate ? `stroke-dashoffset: 0` : undefined}
        ></circle>
    </svg>
{/if}

<style lang="stylus">
.m3-progress
    /* === linear：4dp 高轨道（官方 LinearProgressIndicatorTokens.Height/ActiveThickness） === */
    &--linear
        width: 100%
        height: 4px

        .m3-progress__track
            position: relative
            width: 100%
            height: 100%
            border-radius: var(--shape-corner-full)
            background: var(--surface-container-highest)
            overflow: hidden

        .m3-progress__active
            height: 100%
            border-radius: var(--shape-corner-full)
            background: var(--primary)
            transition: width var(--m3e-duration-medium) var(--m3e-easing-emphasized-decelerate)

        /* indeterminate：高亮段反复扫过（官方 ActiveWave 波浪近似） */
        &.m3-progress--indeterminate .m3-progress__active
            width: 40%
            animation: m3-progress-linear-indeterminate 1.6s var(--m3e-easing-standard) infinite

    /* === circular：40dp 圆环 4dp 厚（官方 CircularProgressIndicatorTokens.Size/TrackThickness） === */
    &--circular
        width: 40px
        height: 40px
        transform: rotate(-90deg)

        .m3-progress__track
            stroke: var(--surface-container-highest)

        .m3-progress__active
            stroke: var(--primary)
            transition: stroke-dasharray var(--m3e-duration-medium) var(--m3e-easing-emphasized-decelerate)

        /* indeterminate：弧长不变 + 整体旋转扫过 */
        &.m3-progress--indeterminate
            animation: m3-progress-circular-indeterminate 1.2s linear infinite
            .m3-progress__active
                transform-origin: center

@keyframes m3-progress-linear-indeterminate
    0%
        transform: translateX(-110%)
    100%
        transform: translateX(360%)

@keyframes m3-progress-circular-indeterminate
    from
        transform: rotate(-90deg)
    to
        transform: rotate(270deg)
</style>

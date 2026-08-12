<script lang="ts">
/**
 * M3E ProgressIndicator — 进度指示原子（官方 ProgressIndicator.kt 移植）。
 * variant: linear（4dp 高轨道）/ circular（40dp 圆环 4dp 厚）。
 * progress: 0-1 定值模式；省略/undefined = indeterminate。
 * 颜色：active = primary、track = surface-container-highest（官方默认）。
 *
 * indeterminate linear 精确复刻官方 FirstLine/SecondLine：4 个 head/tail 值驱动
 * 绘制（Line1 head 0→1000ms、tail 250→1250ms；Line2 head 650→1500ms、
 * tail 900→1750ms，总循环 1750ms），线从 head 生长、tail 消失，无跳变闪烁。
 * Web 用 @property CSS 变量 + keyframes 实现 head/tail 插值。
 *
 * 用法：<ProgressIndicator progress={0.6} />
 *      <ProgressIndicator />                        ← indeterminate（dual 双线）
 *      <ProgressIndicator indeterminate="wave" />   ← 波浪
 *      <ProgressIndicator indeterminate="single" />
 *      <ProgressIndicator indeterminate="dot" />
 */
let {
	variant = "linear",
	progress,
	label = "加载中",
	showStop = true,
	indeterminate = "dual",
	class: className = "",
}: {
	variant?: "linear" | "circular";
	/** 0-1 定值；undefined = indeterminate */
	progress?: number;
	label?: string;
	/** determinate linear 填充末端 stop 圆点（官方 StopSize 4dp），默认显示 */
	showStop?: boolean;
	/** indeterminate linear 动画变体：dual 双线（官方，默认）/ wave 波浪 / single 单线 */
	indeterminate?: "dual" | "wave" | "single";
	class?: string;
} = $props();

// 响应式派生：progress 变化时实时重算（const 只算一次会导致滑块拖动不更新）
const determinate = $derived(progress !== undefined && progress >= 0);
const pct = $derived(determinate ? Math.max(0, Math.min(100, progress * 100)) : 0);
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
            {#if determinate}
                <div class="m3-progress__active" style={`width: ${pct}%`}></div>
                {#if showStop && pct > 0 && pct < 100}
                    <span class="m3-progress__stop" style={`left: ${pct}%`} aria-hidden="true"></span>
                {/if}
            {:else if indeterminate === "wave"}
                <div class="m3-progress__line m3-progress__line--wave"></div>
            {:else if indeterminate === "single"}
                <div class="m3-progress__line m3-progress__line--1"></div>
            {:else}
                <div class="m3-progress__line m3-progress__line--1"></div>
                <div class="m3-progress__line m3-progress__line--2"></div>
            {/if}
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
/* head/tail 插值变量（官方 FirstLine/SecondLine 关键帧时序，总循环 1750ms）：
   Line1 head 0→1000ms(57.14%)、tail 250→1250ms(14.29%→71.43%)
   Line2 head 650→1500ms(37.14%→85.71%)、tail 900→1750ms(51.43%→100%) */
@property --pi-h1 { syntax: "<number>"; inherits: false; initial-value: 0; }
@property --pi-t1 { syntax: "<number>"; inherits: false; initial-value: 0; }
@property --pi-h2 { syntax: "<number>"; inherits: false; initial-value: 0; }
@property --pi-t2 { syntax: "<number>"; inherits: false; initial-value: 0; }

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
            /* 无 overflow 裁剪：head/tail 线始终在 [0,100%] 内无需横向裁剪，
               wave 波浪可上下溢出轨道（官方视觉） */

        .m3-progress__active
            height: 100%
            border-radius: var(--shape-corner-full)
            background: var(--primary)
            transition: width var(--m3e-duration-medium) var(--m3e-easing-emphasized-decelerate)

        /* stop 圆点：active 填充末端 4dp（官方 StopSize），随进度移动 */
        .m3-progress__stop
            position: absolute
            top: 50%
            transform: translate(-50%, -50%)
            width: 4px
            height: 4px
            border-radius: var(--shape-corner-full)
            background: var(--primary)
            transition: left var(--m3e-duration-medium) var(--m3e-easing-emphasized-decelerate)

        /* === indeterminate：官方 head/tail 精确动画（线生长/消失，无跳变） === */
        &.m3-progress--indeterminate .m3-progress__line
            position: absolute
            top: 0
            height: 100%
            border-radius: var(--shape-corner-full)
            background: var(--primary)

        /* Line 1（single 也用它）：线区间 [tail, head]（官方 head 为终点、tail 为起点，
           条件 head - tail > 0 才画）；左右各留 2px gap（官方 TrackActiveSpace 4dp，
           线不贴轨道边缘避免窄线圆角在端点闪烁） */
        &.m3-progress--indeterminate .m3-progress__line--1
            left: calc(var(--pi-t1) * 100% + 2px)
            width: calc((var(--pi-h1) - var(--pi-t1)) * 100% - 4px)
            animation: pi-h1 1750ms linear infinite, pi-t1 1750ms linear infinite

        /* Line 2 */
        &.m3-progress--indeterminate .m3-progress__line--2
            left: calc(var(--pi-t2) * 100% + 2px)
            width: calc((var(--pi-h2) - var(--pi-t2)) * 100% - 4px)
            animation: pi-h2 1750ms linear infinite, pi-t2 1750ms linear infinite

        /* wave：官方 ActiveWave（振幅 3dp / 波长 40dp）——mask 波浪带平铺，
           波浪带在 viewBox 内留白 1px（波峰波谷完整圆滑、不被切断），
           上下各超出 4dp 轨道 2px；background primary 主题色；
           波浪图案 mask-position 横向流动（官方动态效果） */
        &.m3-progress--indeterminate .m3-progress__line--wave
            background: none
            background-color: var(--primary)
            left: calc(var(--pi-t1) * 100% + 2px)
            width: calc((var(--pi-h1) - var(--pi-t1)) * 100% - 4px)
            animation:
                pi-h1 1750ms linear infinite,
                pi-t1 1750ms linear infinite,
                m3-progress-wave-flow 900ms linear infinite
            height: 8px
            top: 50%
            transform: translateY(-50%)
            -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='8'%3E%3Cpath d='M0 1 Q 10 7, 20 1 T 40 1 L 40 7 Q 30 1, 20 7 T 0 7 Z' fill='black'/%3E%3C/svg%3E")
            mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='8'%3E%3Cpath d='M0 1 Q 10 7, 20 1 T 40 1 L 40 7 Q 30 1, 20 7 T 0 7 Z' fill='black'/%3E%3C/svg%3E")
            -webkit-mask-repeat: repeat-x
            mask-repeat: repeat-x
            -webkit-mask-size: 40px 8px
            mask-size: 40px 8px

        /* dot 变体已移除（不再需要圆点流） */

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

/* 官方 Line1/Line2 head/tail 关键帧（1750ms 总循环） */
@keyframes pi-h1
    0%
        --pi-h1: 0
    57.14%
        --pi-h1: 1
    100%
        --pi-h1: 1

@keyframes pi-t1
    0%, 14.29%
        --pi-t1: 0
    71.43%
        --pi-t1: 1
    100%
        --pi-t1: 1

@keyframes pi-h2
    0%, 37.14%
        --pi-h2: 0
    85.71%
        --pi-h2: 1
    100%
        --pi-h2: 1

@keyframes pi-t2
    0%, 51.43%
        --pi-t2: 0
    100%
        --pi-t2: 1

/* 波浪横向流动（一个波长 40px 的 mask 滚动） */
@keyframes m3-progress-wave-flow
    from
        -webkit-mask-position: 0 0
        mask-position: 0 0
    to
        -webkit-mask-position: 40px 0
        mask-position: 40px 0

@keyframes m3-progress-circular-indeterminate
    from
        transform: rotate(-90deg)
    to
        transform: rotate(270deg)
</style>

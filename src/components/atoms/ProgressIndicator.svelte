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
	color = "var(--primary)",
	trackColor = "var(--surface-container-highest)",
	strokeCap = "round",
	gapSize = 4,
	class: className = "",
}: {
	variant?: "linear" | "circular";
	/** 0-1 定值；undefined = indeterminate */
	progress?: number;
	label?: string;
	/** determinate linear 填充末端 stop 圆点（官方 StopSize 4dp），默认显示 */
	showStop?: boolean;
	/** indeterminate 动画变体（linear：dual 双线官方默认 / wave 波浪 / single 单线；
	    circular：dual 官方弧伸缩 / single 固定弧 / wave 官方带弧度旋转组合：
	    全局 3 圈匀速 + 每 1.5s 快转 90° 停 1.2s + 弧长 0.1↔0.87） */
	indeterminate?: "dual" | "wave" | "single";
	/** active 指示器颜色（官方 color 参数） */
	color?: string;
	/** 轨道颜色（官方 trackColor 参数） */
	trackColor?: string;
	/** 线端形状：round 圆头（官方默认）/ butt 平头 */
	strokeCap?: "round" | "butt";
	/** active 与 track 之间的间隙 px（官方 gapSize 参数，默认 4） */
	gapSize?: number;
	class?: string;
} = $props();

// 响应式派生：progress 变化时实时重算（const 只算一次会导致滑块拖动不更新）
const determinate = $derived(progress !== undefined && progress >= 0);
const pct = $derived(determinate ? Math.max(0, Math.min(100, progress * 100)) : 0);
// 圆环：周长 = 2πr（r = (40 - 4)/2 = 18）
const CIRC = 2 * Math.PI * 18;
// circular gap 像素：官方 adjustedGapSize = gapSize + strokeWidth（round cap 弧端补偿）
const gapPx = $derived(gapSize + 4);
</script>

{#if variant === "linear"}
    <div
        class="m3-progress m3-progress--linear {className}"
        class:m3-progress--indeterminate={!determinate}
        class:m3-progress--butt={strokeCap === "butt"}
        role="progressbar"
        aria-label={label}
        aria-valuenow={determinate ? pct : undefined}
        aria-valuemin={determinate ? 0 : undefined}
        aria-valuemax={determinate ? 100 : undefined}
        style={`--pi-progress: ${pct}; --pi-gap: ${gapSize}px; --pi-color: ${color}; --pi-track: ${trackColor}`}
    >
        <div class="m3-progress__track">
            {#if determinate}
                <div class="m3-progress__track-fill"></div>
                <div class="m3-progress__active"></div>
                {#if showStop && pct > 0 && pct < 100}
                    <span class="m3-progress__stop" aria-hidden="true"></span>
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
        class="m3-progress m3-progress--circular m3-progress--circular-{indeterminate} {className}"
        class:m3-progress--indeterminate={!determinate}
        style={`--pi-color: ${color}; --pi-track: ${trackColor}`}
        role="progressbar"
        aria-label={label}
        aria-valuenow={determinate ? pct : undefined}
        aria-valuemin={determinate ? 0 : undefined}
        aria-valuemax={determinate ? 100 : undefined}
        viewBox="0 0 40 40"
    >
        {#if determinate}
            <!-- circle + dasharray/dashoffset（可 CSS transition 平滑转动）：
                 active 完整 0→progress（rotate -90 到 12 点起）；
                 track 从 active 末端 + gap 开始，dashoffset 负值（SVG 正值向后移）。
                 绘制顺序：先 track 后 active（官方 active 在顶层），避免 track 圆头
                 round cap 盖到 active 颜色弧上形成圆点 -->
            <circle
                class="m3-progress__track-rest"
                cx="20"
                cy="20"
                r="18"
                fill="none"
                stroke-width="4"
                stroke-linecap="round"
                stroke-dasharray={`${Math.max(CIRC * (1 - progress) - gapPx * 2, 0)} ${CIRC}`}
                stroke-dashoffset={`${-(CIRC * progress + gapPx)}`}
            ></circle>
            <circle
                class="m3-progress__active"
                cx="20"
                cy="20"
                r="18"
                fill="none"
                stroke-width="4"
                stroke-linecap="round"
                stroke-dasharray={`${CIRC * progress} ${CIRC}`}
                stroke-dashoffset="0"
            ></circle>
        {:else}
            <circle class="m3-progress__track" cx="20" cy="20" r="18" fill="none" stroke-width="4"></circle>
            <circle
                class="m3-progress__active"
                cx="20"
                cy="20"
                r="18"
                fill="none"
                stroke-width="4"
                stroke-linecap="round"
            ></circle>
        {/if}
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
            /* 无 overflow 裁剪：head/tail 线始终在 [0,100%] 内无需横向裁剪，
               wave 波浪可上下溢出轨道（官方视觉） */

        /* determinate track：从 progress + gap 开始（左侧 active + gap 空白区域，
           官方 gapSize 参数：active 与 track 之间的间隙） */
        .m3-progress__track-fill
            position: absolute
            top: 0
            bottom: 0
            right: 0
            left: calc(var(--pi-progress) * 1% + var(--pi-gap))
            border-radius: var(--shape-corner-full)
            background: var(--pi-track)

        .m3-progress__active
            position: absolute
            top: 0
            bottom: 0
            left: 0
            width: calc(var(--pi-progress) * 1%)
            border-radius: var(--shape-corner-full)
            background: var(--pi-color)
            transition: width var(--m3e-duration-medium) var(--m3e-easing-emphasized-decelerate)

        /* stop 圆点：active 填充末端 4dp（官方 StopSize），随进度移动 */
        .m3-progress__stop
            position: absolute
            top: 50%
            transform: translate(-50%, -50%)
            width: 4px
            height: 4px
            border-radius: var(--shape-corner-full)
            background: var(--pi-color)
            left: calc(var(--pi-progress) * 1% + var(--pi-gap) / 2)
            transition: left var(--m3e-duration-medium) var(--m3e-easing-emphasized-decelerate)

        /* butt 平头（官方 StrokeCap.Butt） */
        &.m3-progress--butt
            .m3-progress__track,
            .m3-progress__track-fill,
            .m3-progress__active
                border-radius: 0

        /* indeterminate：track 全宽背景（颜色走 trackColor 参数） */
        &.m3-progress--indeterminate .m3-progress__track
            background: var(--pi-track)

        /* === indeterminate：官方 head/tail 精确动画（线生长/消失，无跳变） === */
        &.m3-progress--indeterminate .m3-progress__line
            position: absolute
            top: 0
            height: 100%
            border-radius: var(--shape-corner-full)
            background: var(--pi-color)

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
            background-color: var(--pi-color)
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
        /* circle dash 从 3 点起，rotate -90 到 12 点（determinate 弧起点同） */
        transform: rotate(-90deg)

        .m3-progress__track
            stroke: var(--pi-track)

        .m3-progress__active
            stroke: var(--pi-color)
            transition: stroke-dasharray var(--m3e-duration-medium) var(--m3e-easing-emphasized-decelerate)

        /* determinate：剩余 track 环（active 末端 + gap 开始，官方无 stop 圆点） */
        .m3-progress__track-rest
            stroke: var(--pi-track)
            transition: stroke-dasharray var(--m3e-duration-medium) var(--m3e-easing-emphasized-decelerate), stroke-dashoffset var(--m3e-duration-medium) var(--m3e-easing-emphasized-decelerate)

        /* butt 平头（官方 StrokeCap.Butt） */
        &.m3-progress--butt
            .m3-progress__active,
            .m3-progress__track-rest
                stroke-linecap: butt

        /* === indeterminate 变体（官方三层动画：弧长伸缩 + 全局旋转 + 步进） === */
        &.m3-progress--indeterminate.m3-progress--circular-dual
            /* 官方：弧长 0.1↔0.87 伸缩 + 360° 旋转，6000ms（globalRotation + progress） */
            animation: m3-progress-circular-rotate 6000ms linear infinite
            .m3-progress__active
                animation: m3-progress-circular-dual-sweep 6000ms linear infinite

        &.m3-progress--indeterminate.m3-progress--circular-single
            /* 固定弧长 + 快速旋转（经典） */
            animation: m3-progress-circular-rotate 1200ms linear infinite
            .m3-progress__active
                stroke-dasharray: 28.3 113.1

        &.m3-progress--indeterminate.m3-progress--circular-wave
            /* 官方带弧度旋转：全局 3 圈匀速 + 每 1.5s 快转 90°（300ms 强调减速）停 1.2s */
            animation: m3-progress-circular-wave-rotate 6000ms linear infinite
            .m3-progress__active
                /* 官方弧长伸缩 0.1↔0.87（6000ms，上行 standard / 回落 linear） */
                animation: m3-progress-circular-wave-sweep 6000ms linear infinite

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

/* circular indeterminate：整体旋转（弧长动画由 dasharray 变体控制） */
@keyframes m3-progress-circular-rotate
    from
        transform: rotate(-90deg)
    to
        transform: rotate(270deg)

/* 官方弧长伸缩：0.1 ↔ 0.87 周长（6000ms） */
@keyframes m3-progress-circular-dual-sweep
    0%, 100%
        stroke-dasharray: 11.3 113.1
    50%
        stroke-dasharray: 98.4 113.1

/* 官方弧长伸缩（0.1 ↔ 0.87，6000ms）：上行 standard easing、回落线性 */
@keyframes m3-progress-circular-wave-sweep
    0%
        stroke-dasharray: 11.3 113.1
        animation-timing-function: cubic-bezier(0.2, 0, 0, 1)
    50%
        stroke-dasharray: 98.4 113.1
        animation-timing-function: linear
    100%
        stroke-dasharray: 11.3 113.1

/* 官方带弧度旋转（6000ms 周期）：合成角度 = -90°（12 点基准）+ 全局 1080° 匀速
   + 附加步进 360°（每 1.5s：300ms 强调减速转 90°，随后停 1.2s，共 4 步）。
   各段 easing：步进段 cubic-bezier(0.05, 0.7, 0.1, 1)（官方 EasingEmphasizedDecelerate），
   停顿段 linear（随全局匀速） */
@keyframes m3-progress-circular-wave-rotate
    0%
        transform: rotate(-90deg)
        animation-timing-function: cubic-bezier(0.05, 0.7, 0.1, 1)
    5%
        transform: rotate(54deg)
        animation-timing-function: linear
    25%
        transform: rotate(270deg)
        animation-timing-function: cubic-bezier(0.05, 0.7, 0.1, 1)
    30%
        transform: rotate(414deg)
        animation-timing-function: linear
    50%
        transform: rotate(630deg)
        animation-timing-function: cubic-bezier(0.05, 0.7, 0.1, 1)
    55%
        transform: rotate(774deg)
        animation-timing-function: linear
    75%
        transform: rotate(990deg)
        animation-timing-function: cubic-bezier(0.05, 0.7, 0.1, 1)
    80%
        transform: rotate(1134deg)
        animation-timing-function: linear
    100%
        transform: rotate(1350deg)
</style>

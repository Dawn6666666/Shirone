<script lang="ts">
/**
 * M3E TimePicker — 时间选择器（官方 TimePicker 表盘版移植，简化：未做输入模式）。
 * 表盘 256dp：小时（12h 单环 / 24h 双环：外 1-12 + 内 13-24，0 显示为 24）→ 分钟（60 刻度 + 每 5 分钟数字）；
 * 点击按角度吸附最近的小时/分钟（官方 ClockFace 行为），刻度为视觉点、数字按钮可精确点选；
 * 选中手柄 48dp primary-container 全圆（非整 5 分钟时手柄内显示分钟数字）、轨道 2dp primary + 中心点 8dp；
 * 头部分段显示 HH:MM（点击切回对应阶段），12h 模式右侧 上午/下午（tertiary-container 选中）；
 * value 为 24h "HH:MM"（ISO 风格，如 "14:30"），选完分钟即提交（onchange）。
 */
let {
	value = $bindable(""),
	label = "选择时间",
	format = "h24",
	onchange,
	class: className = "",
}: {
	/** 当前时间 24h "HH:MM"（$bindable） */
	value?: string;
	label?: string;
	/** h24（默认，24 小时制双环）/ h12（12 小时制 + 上午/下午） */
	format?: "h24" | "h12";
	onchange?: (time: string) => void;
	class?: string;
} = $props();

let stage = $state<"hour" | "minute">("hour");
let hour = $state(0);
let minute = $state(0);

const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value);
if (m) {
	hour = +m[1];
	minute = +m[2];
}

const h12 = format === "h12";

function displayHour(): number {
	const h = hour % 12;
	return h === 0 ? 12 : h;
}

function commit() {
	value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
	onchange?.(value);
}

function selectHour(h: number) {
	hour = h;
	stage = "minute";
}

function selectMinute(min: number) {
	minute = min;
	commit();
}

function setPeriod(period: "am" | "pm") {
	const isPm = period === "pm";
	if ((hour >= 12) !== isPm) {
		hour = (hour + 12) % 24;
		commit();
	}
}

/* ---- 表盘几何：dial 256px，中心 (50%,50%) ---- */
const OUTER_R = 100;
const INNER_R = 58;
const DIAL = 256;

function pos(r: number, angle: number): string {
	const rad = (angle * Math.PI) / 180;
	const x = 50 + (r / DIAL) * 100 * Math.sin(rad);
	const y = 50 - (r / DIAL) * 100 * Math.cos(rad);
	return `left: ${x.toFixed(2)}%; top: ${y.toFixed(2)}%`;
}

const hourItems = $derived.by(() => {
	const items: { v: number; label: string; r: number; angle: number }[] = [];
	for (let h = 1; h <= 12; h++) {
		items.push({ v: h, label: String(h), r: OUTER_R, angle: ((h % 12) / 12) * 360 });
	}
	if (!h12) {
		for (let h = 13; h <= 24; h++) {
			const v = h === 24 ? 0 : h;
			items.push({ v, label: String(h), r: INNER_R, angle: ((h % 12) / 12) * 360 });
		}
	}
	return items;
});

const minuteNumbers = $derived.by(() => {
	const nums: { m: number; label: string; angle: number }[] = [];
	for (let i = 0; i < 60; i += 5) {
		nums.push({ m: i, label: String(i).padStart(2, "0"), angle: (i / 60) * 360 });
	}
	return nums;
});

const minuteTicks = $derived.by(() => {
	const ticks: { m: number; angle: number }[] = [];
	for (let i = 0; i < 60; i++) {
		if (i % 5 === 0) continue;
		ticks.push({ m: i, angle: (i / 60) * 360 });
	}
	return ticks;
});

const trackAngle = $derived(stage === "hour" ? ((hour % 12) / 12) * 360 : (minute / 60) * 360);

const showMinuteHandle = $derived(stage === "minute" && minute % 5 !== 0);

/** 官方 ClockFace 角度吸附：点击表盘任意位置 → 最近的小时/分钟 */
function onDialClick(e: MouseEvent) {
	const el = e.currentTarget as HTMLElement;
	const rect = el.getBoundingClientRect();
	const cx = rect.left + rect.width / 2;
	const cy = rect.top + rect.height / 2;
	const deg = (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
	const from12 = (deg + 90 + 360) % 360;
	if (stage === "hour") {
		const h = Math.round(from12 / 30) % 12;
		selectHour(h === 0 ? 12 : h);
	} else {
		const min = Math.round(from12 / 6) % 60;
		selectMinute(min);
	}
}
</script>

<div class="m3-time-picker {className}" role="group" aria-label={label}>
	<div class="m3-time-picker__header">
		<div class="m3-time-picker__time" role="group" aria-label="当前时间">
			<button
				type="button"
				class="m3-time-picker__segment"
				class:m3-time-picker__segment--active={stage === "hour"}
				aria-label="选择小时"
				onclick={() => (stage = "hour")}
			>{h12 ? String(displayHour()) : String(hour).padStart(2, "0")}</button>
			<span class="m3-time-picker__colon" aria-hidden="true">:</span>
			<button
				type="button"
				class="m3-time-picker__segment"
				class:m3-time-picker__segment--active={stage === "minute"}
				aria-label="选择分钟"
				onclick={() => (stage = "minute")}
			>{String(minute).padStart(2, "0")}</button>
		</div>
		{#if h12}
			<div class="m3-time-picker__period" role="group" aria-label="上午/下午">
				<button
					type="button"
					class="m3-time-picker__period-btn"
					class:m3-time-picker__period-btn--selected={hour < 12}
					onclick={() => setPeriod("am")}
				>上午</button>
				<button
					type="button"
					class="m3-time-picker__period-btn"
					class:m3-time-picker__period-btn--selected={hour >= 12}
					onclick={() => setPeriod("pm")}
				>下午</button>
			</div>
		{/if}
	</div>
	<div class="m3-time-picker__dial" role="group" aria-label={stage === "hour" ? "选择小时" : "选择分钟"}>
		<span class="m3-time-picker__track" style={`transform: rotate(${trackAngle}deg)`} aria-hidden="true"></span>
		<span class="m3-time-picker__center" aria-hidden="true"></span>
		<button
			type="button"
			class="m3-time-picker__overlay"
			tabindex="-1"
			aria-hidden="true"
			onclick={onDialClick}
		></button>
		{#if stage === "hour"}
			{#each hourItems as item (item.v)}
				<button
					type="button"
					class="m3-time-picker__num"
					class:m3-time-picker__num--inner={item.r === INNER_R}
					class:m3-time-picker__num--selected={hour === item.v}
					style={pos(item.r, item.angle)}
					aria-label={`${item.label} 点`}
					onclick={() => selectHour(item.v)}
				>{item.label}</button>
			{/each}
		{:else}
			{#each minuteTicks as tick (tick.m)}
				<span
					class="m3-time-picker__tick"
					class:m3-time-picker__tick--selected={minute === tick.m}
					style={pos(OUTER_R, tick.angle)}
					aria-hidden="true"
				></span>
			{/each}
			{#each minuteNumbers as item (item.m)}
				<button
					type="button"
					class="m3-time-picker__num m3-time-picker__num--minute"
					class:m3-time-picker__num--selected={minute === item.m}
					style={pos(OUTER_R, item.angle)}
					aria-label={`${item.m} 分`}
					onclick={() => selectMinute(item.m)}
				>{item.label}</button>
			{/each}
			{#if showMinuteHandle}
				<span
					class="m3-time-picker__handle"
					style={pos(OUTER_R, (minute / 60) * 360)}
					aria-hidden="true"
				>{String(minute).padStart(2, "0")}</span>
			{/if}
		{/if}
	</div>
</div>

<style lang="stylus">
.m3-time-picker
	display: inline-flex
	flex-direction: column
	width: 304px
	box-sizing: border-box
	padding: 24px
	gap: 24px
	border-radius: var(--shape-corner-xl)
	background: var(--surface-container-high)
	color: var(--on-surface)

	&__header
		display: flex
		align-items: center
		justify-content: space-between
		width: 100%
		height: 96px

	&__time
		display: flex
		align-items: baseline
		gap: 4px
		font: var(--m3e-type-headline-medium)

	&__segment
		border: none
		background: none
		padding: 4px 8px
		border-radius: var(--shape-corner-s)
		font: inherit
		line-height: 1.25
		color: var(--on-surface-variant)
		cursor: pointer
		transition: color var(--m3e-duration-short) var(--m3e-easing-standard), background-color var(--m3e-duration-short) var(--m3e-easing-standard)

		&--active
			color: var(--on-surface)

	&__colon
		color: var(--on-surface-variant)

	&__period
		display: flex
		flex-direction: column
		gap: 8px

	&__period-btn
		height: 40px
		min-width: 72px
		padding: 0 12px
		border: 1px solid var(--outline)
		border-radius: var(--shape-corner-full)
		background: transparent
		color: var(--on-surface-variant)
		font: var(--m3e-type-label-large)
		cursor: pointer
		transition: background-color var(--m3e-duration-short) var(--m3e-easing-standard), color var(--m3e-duration-short) var(--m3e-easing-standard), border-color var(--m3e-duration-short) var(--m3e-easing-standard)

		&:hover
			background: unquote("color-mix(in oklab, var(--on-surface) 8%, transparent)")

		&--selected
			background: var(--tertiary-container)
			color: var(--on-tertiary-container)
			border-color: transparent

			&:hover
				background: var(--tertiary-container)

	&__dial
		position: relative
		width: 256px
		height: 256px
		margin: 0 auto
		border-radius: var(--shape-corner-full)
		background: var(--surface-container-highest)
		user-select: none

	&__track
		position: absolute
		left: calc(50% - 1px)
		top: 50%
		width: 2px
		height: 100px
		border-radius: var(--shape-corner-full)
		background: var(--primary)
		transform-origin: top center
		pointer-events: none
		transition: transform var(--m3e-duration-medium) var(--m3e-easing-emphasized-decelerate)

	&__center
		position: absolute
		left: 50%
		top: 50%
		width: 8px
		height: 8px
		border-radius: var(--shape-corner-full)
		background: var(--primary)
		transform: translate(-50%, -50%)
		pointer-events: none

	&__overlay
		position: absolute
		inset: 0
		border: none
		border-radius: var(--shape-corner-full)
		background: transparent
		cursor: pointer

	&__num
		position: absolute
		width: 40px
		height: 40px
		transform: translate(-50%, -50%)
		border: none
		border-radius: var(--shape-corner-full)
		background: none
		color: var(--on-surface-variant)
		font: var(--m3e-type-label-large)
		cursor: pointer
		transition: background-color var(--m3e-duration-short) var(--m3e-easing-standard), color var(--m3e-duration-short) var(--m3e-easing-standard)

		&:hover
			background: unquote("color-mix(in oklab, var(--on-surface) 8%, transparent)")

		&--inner
			width: 30px
			height: 30px
			font: var(--m3e-type-label-medium)

		&--minute
			width: 36px
			height: 36px
			font: var(--m3e-type-label-small)

		&--selected
			width: 48px
			height: 48px
			background: var(--primary-container)
			color: var(--on-primary-container)
			font: var(--m3e-type-title-medium)

			&:hover
				background: var(--primary-container)

	&__tick
		position: absolute
		width: 20px
		height: 20px
		transform: translate(-50%, -50%)
		pointer-events: none

		&::after
			content: ""
			position: absolute
			left: 50%
			top: 50%
			width: 2px
			height: 2px
			border-radius: var(--shape-corner-full)
			background: var(--on-surface-variant)
			transform: translate(-50%, -50%)

		&--selected::after
			width: 6px
			height: 6px
			background: var(--primary)

	&__handle
		position: absolute
		width: 48px
		height: 48px
		transform: translate(-50%, -50%)
		display: flex
		align-items: center
		justify-content: center
		border-radius: var(--shape-corner-full)
		background: var(--primary-container)
		color: var(--on-primary-container)
		font: var(--m3e-type-title-medium)
		pointer-events: none
		transition: left var(--m3e-duration-medium) var(--m3e-easing-emphasized-decelerate), top var(--m3e-duration-medium) var(--m3e-easing-emphasized-decelerate)
</style>

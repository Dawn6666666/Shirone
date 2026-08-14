<script lang="ts">
import Icon from "@iconify/svelte";

/**
 * M3E IconButton — M3 图标按钮原子（官方 IconButton 移植，token 对齐 v0.192 md-comp-{icon,filled,filled-tonal,outlined}-icon-button + latest 尺寸/shape 变体）：
 * - 四种官方变体：standard（透明 + on-surface 图标）/ filled（primary 圆底 + on-primary 图标）/
 *   tonal（secondary-container 圆底）/ outlined（透明 + outline 描边）；
 * - 尺寸对齐最新版：xsmall 32px/图标20 / small 40px/24（官方基础）/ medium 56px/24 / large 96px/32 / xlarge 136px/40；
 * - shape：round（默认，corner-full）/ square（按尺寸 corner-medium~extra-large）；toggle 选中时形状互换（官方行为）；
 * - toggle 模式：checked（$bindable）+ checkedIcon，点击切换并触发 onchange，aria-pressed 同步；
 * - 交互：原生 button + m3-state-layer（hover/focus/pressed）；disabled 对齐官方（图标 38%、filled/tonal 容器 12%）；
 * - 通用场景：工具条操作、收藏/开关图标、AppBar 动作等。
 */
let {
	icon = "",
	checkedIcon = "",
	variant = "standard",
	size = "small",
	shape = "round",
	toggle = false,
	checked = $bindable(false),
	disabled = false,
	label = "",
	id = undefined,
	onclick,
	onchange,
	class: className = "",
	style = "",
}: {
	/** 图标（Iconify 名；toggle 模式下为未选中图标） */
	icon?: string;
	/** toggle 模式选中图标（Iconify 名） */
	checkedIcon?: string;
	/** 变体：standard（默认）/ filled / tonal / outlined */
	variant?: "standard" | "filled" | "tonal" | "outlined";
	/** 尺寸：xsmall 32 / small 40（默认）/ medium 56 / large 96 / xlarge 136 */
	size?: "xsmall" | "small" | "medium" | "large" | "xlarge";
	/** 形状：round（默认，圆形）/ square（方形，按尺寸圆角） */
	shape?: "round" | "square";
	/** toggle 模式：点击切换 checked */
	toggle?: boolean;
	/** 选中态（toggle 模式），$bindable */
	checked?: boolean;
	disabled?: boolean;
	/** 无障碍标签（aria-label） */
	label?: string;
	/** 根元素 id 透传（供 CSS 选择器 / 锚点引用） */
	id?: string;
	onclick?: () => void;
	/** toggle 模式选中变化回调 */
	onchange?: (checked: boolean) => void;
	class?: string;
	style?: string;
} = $props();

function handleClick() {
	if (toggle) {
		checked = !checked;
		onchange?.(checked);
	}
	onclick?.();
}
</script>

<button
	type="button"
	id={id}
	class="m3-icon-button m3-icon-button--{variant} m3-icon-button--{size} m3-icon-button--{shape} m3-state-layer {className}"
	class:m3-icon-button--checked={checked}
	class:m3-icon-button--disabled={disabled}
	{style}
	aria-label={label}
	aria-pressed={toggle ? checked : undefined}
	disabled={disabled}
	onclick={handleClick}
>
	<Icon icon={checked && checkedIcon ? checkedIcon : icon} />
</button>

<style lang="stylus">
.m3-icon-button
	display: inline-flex
	align-items: center
	justify-content: center
	padding: 0
	border: none
	background: transparent
	color: var(--on-surface)
	cursor: pointer
	flex-shrink: 0
	user-select: none
	-webkit-tap-highlight-color: transparent
	--m3e-state-color: var(--on-surface)
	--ib-square: var(--shape-corner-m)
	--ib-radius: var(--shape-corner-full)
	border-radius: var(--ib-radius)
	transition:
		background-color var(--m3e-duration-short) var(--m3e-easing-standard),
		color var(--m3e-duration-short) var(--m3e-easing-standard),
		border-color var(--m3e-duration-short) var(--m3e-easing-standard),
		border-radius var(--m3e-duration-medium) var(--m3e-easing-emphasized-decelerate)

	> :global(svg)
		width: 1.25rem
		height: 1.25rem
		flex-shrink: 0

	&--disabled
		pointer-events: none

	/* === 尺寸（latest md-comp-icon-button-*） === */
	&--xsmall
		width: 2rem /* 32px */
		height: 2rem
		--ib-square: var(--shape-corner-m)

		> :global(svg)
			width: 1.25rem /* 20px */
			height: 1.25rem

	&--small
		width: 2.5rem /* 40px */
		height: 2.5rem
		--ib-square: var(--shape-corner-m)

		> :global(svg)
			width: 1.5rem /* 24px */
			height: 1.5rem

	&--medium
		width: 3.5rem /* 56px */
		height: 3.5rem
		--ib-square: var(--shape-corner-l) /* corner-large 16px */

		> :global(svg)
			width: 1.5rem /* 24px */
			height: 1.5rem

	&--large
		width: 6rem /* 96px */
		height: 6rem
		--ib-square: var(--shape-corner-xl) /* corner-extra-large 28px */

		> :global(svg)
			width: 2rem /* 32px */
			height: 2rem

	&--xlarge
		width: 8.5rem /* 136px */
		height: 8.5rem
		--ib-square: var(--shape-corner-xl)

		> :global(svg)
			width: 2.5rem /* 40px */
			height: 2.5rem

	/* === 形状（选中时互换，官方行为） === */
	&--square
		--ib-radius: var(--ib-square)

	&--checked
		&.m3-icon-button--round
			--ib-radius: var(--ib-square)

		&.m3-icon-button--square
			--ib-radius: var(--shape-corner-full)

	/* === 变体（v0.192 tokens） === */
	&--standard
		color: var(--on-surface)
		--m3e-state-color: var(--on-surface)

		&.m3-icon-button--checked
			color: var(--primary) /* selected-icon-color */
			--m3e-state-color: var(--primary)

		&.m3-icon-button--disabled
			color: var(--on-surface)
			opacity: 0.38

	&--filled
		background: var(--primary)
		color: var(--on-primary)
		--m3e-state-color: var(--on-primary)

		&.m3-icon-button--disabled
			/* 覆盖全局 .m3-state-layer[disabled] 的 opacity 0.38，避免双重透明；容器/图标透明度分别由下方控制 */
			opacity: 1
			background: unquote("color-mix(in srgb, var(--on-surface) 12%, transparent)")
			color: var(--on-surface)

			> :global(svg)
				opacity: 0.38

	&--tonal
		background: var(--secondary-container)
		color: var(--on-secondary-container)
		--m3e-state-color: var(--on-secondary-container)

		&.m3-icon-button--checked
			background: var(--secondary) /* latest selected-container-color: secondary */
			color: var(--on-secondary)
			--m3e-state-color: var(--on-secondary)

		&.m3-icon-button--disabled
			/* 覆盖全局 .m3-state-layer[disabled] 的 opacity 0.38，避免双重透明；容器/图标透明度分别由下方控制 */
			opacity: 1
			background: unquote("color-mix(in srgb, var(--on-surface) 12%, transparent)")
			color: var(--on-surface)

			> :global(svg)
				opacity: 0.38

	&--outlined
		border: 1px solid var(--outline)
		color: var(--on-surface)
		--m3e-state-color: var(--on-surface)

		&.m3-icon-button--checked
			background: var(--inverse-surface) /* latest selected-container-color: inverse-surface */
			color: var(--inverse-on-surface)
			border-color: transparent
			--m3e-state-color: var(--inverse-on-surface)

		&.m3-icon-button--disabled
			/* 覆盖全局 0.38：边框 12%、图标 38% 分开控制（官方 disabled-unselected-outline-opacity 0.12 + disabled-icon-opacity 0.38） */
			opacity: 1
			border-color: unquote("color-mix(in srgb, var(--on-surface) 12%, transparent)")

			> :global(svg)
				opacity: 0.38
</style>

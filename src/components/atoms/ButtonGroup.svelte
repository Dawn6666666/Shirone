<script lang="ts">
/**
 * M3E ButtonGroup — 按钮组原子（官方 ButtonGroup.kt 移植，数据驱动版）。
 * 40dp 高。两项变体：
 * - standard：12px 间距，每项独立 pill（ToggleButton 默认形状变形）
 * - connected：2px 间距；首项（外侧全圆 + 内侧 8px）、中间项（4dp 圆角）、
 *   尾项（外侧全圆 + 内侧 8px）；按压时内角 8→4px；选中项变全圆 pill
 *   （官方 ConnectedButtonGroup tokens + connectedButtonCheckedShape）
 * - 按压宽度膨胀 15%（官方 pressed-item-width-multiplier，flex-grow 简化版）
 *
 * 单选：value（$bindable）；多选：multiple + checkedValues（$bindable）。
 * 溢出指示器与 animateWidth 动态宽度未实现（TODO）。
 */
import Icon from "@iconify/svelte";
import ToggleButton from "./ToggleButton.svelte";

export interface ButtonGroupItem {
	value: string;
	label?: string;
	icon?: string;
}

let {
	items = [],
	value = $bindable(""),
	checkedValues = $bindable([] as string[]),
	multiple = false,
	variant = "standard",
	disabled = false,
	class: className = "",
	onchange,
}: {
	items?: ButtonGroupItem[];
	value?: string;
	checkedValues?: string[];
	multiple?: boolean;
	variant?: "standard" | "connected";
	disabled?: boolean;
	class?: string;
	onchange?: (value: string | string[]) => void;
} = $props();

function isChecked(item: ButtonGroupItem) {
	return multiple
		? checkedValues.includes(item.value)
		: value === item.value;
}

function handleChange(item: ButtonGroupItem) {
	if (multiple) {
		checkedValues = checkedValues.includes(item.value)
			? checkedValues.filter((v) => v !== item.value)
			: [...checkedValues, item.value];
		onchange?.(checkedValues);
	} else {
		value = item.value;
		onchange?.(value);
	}
}
</script>

<div
    class="m3-button-group m3-button-group--{variant} {className}"
    role="group"
>
    {#each items as item, i (item.value)}
        <ToggleButton
            controlled
            variant={variant === "connected" ? "tonal" : "filled"}
            checked={isChecked(item)}
            disabled={disabled}
            onclick={() => handleChange(item)}
            label={item.label}
            class="m3-button-group__item m3-button-group__item--{i === 0 ? "first" : i === items.length - 1 ? "last" : "middle"}"
        >
            {#if item.icon}
                <Icon icon={item.icon}></Icon>
            {/if}
        </ToggleButton>
    {/each}
</div>

<style lang="stylus">
.m3-button-group
    display: inline-flex
    align-items: stretch

    /* === standard：12px 间距（ButtonGroupSmallTokens.BetweenSpace） === */
    &--standard
        gap: 0.75rem

    /* === connected：2px 间距 + 首/中/尾形状 + 内角变形（官方 tokens） === */
    &--connected
        gap: 2px
        :global(.m3-toggle-button)
            border-radius: 4px
        /* 首项：外侧全圆 + 内侧 8px；按压内角 8→4px */
        :global(.m3-button-group__item--first)
            border-radius: var(--shape-corner-full) 8px 8px var(--shape-corner-full)
        :global(.m3-button-group__item--first:active)
            border-radius: var(--shape-corner-full) 4px 4px var(--shape-corner-full)
        /* 尾项：外侧全圆 + 内侧 8px；按压内角 8→4px */
        :global(.m3-button-group__item--last)
            border-radius: 8px var(--shape-corner-full) var(--shape-corner-full) 8px
        :global(.m3-button-group__item--last:active)
            border-radius: 4px var(--shape-corner-full) var(--shape-corner-full) 4px
        /* 选中项：全圆 pill（官方 connectedButtonCheckedShape = CornerFull） */
        :global(.m3-toggle-button--checked)
            border-radius: var(--shape-corner-full)

    /* 按压宽度膨胀 15%（官方 pressed-item-width-multiplier，flex-grow 简化） */
    :global(.m3-toggle-button)
        flex: 0 0 auto
        transition:
            border-radius var(--m3e-duration-medium) var(--m3e-easing-emphasized-decelerate),
            background-color var(--m3e-duration-medium) var(--m3e-easing-standard),
            color var(--m3e-duration-medium) var(--m3e-easing-standard),
            border-color var(--m3e-duration-medium) var(--m3e-easing-standard),
            box-shadow var(--m3e-duration-medium) var(--m3e-easing-standard),
            flex-grow var(--m3e-duration-medium) var(--m3e-easing-emphasized-decelerate)
    :global(.m3-toggle-button:active)
        flex-grow: 0.15
</style>

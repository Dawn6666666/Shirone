<script lang="ts">
/**
 * M3E Tooltip — 提示气泡原子（官方 PlainTooltipTokens / RichTooltipTokens）。
 * 包裹式：<Tooltip variant="plain" label="提示">锚点</Tooltip>
 * 锚点 hover / focus（键盘可达，focusin 时注入 aria-describedby）显示。
 *
 * 变体：
 * - plain（默认）：inverse-surface + corner-xs + body-small，无阴影
 * - rich：surface-container + corner-medium + elevation-2，title（title-small）
 *   + supporting（body-medium）+ 可选 action（primary, label-large）
 * 方向：placement="bottom"（默认，向下弹出）/ "top"（向上弹出，
 * 用于卡片底部等下方空间不足的锚点，如资料卡社交图标）。
 */
let {
    variant = "plain",
    label = "",
    title = "",
    supporting = "",
    action = null,
    placement = "bottom",
    class: className = "",
}: {
    variant?: "plain" | "rich";
    label?: string;
    title?: string;
    supporting?: string;
    action?: { label: string; onClick: () => void } | null;
    /** 弹出方向：bottom（锚点下方，默认）/ top（锚点上方） */
    placement?: "top" | "bottom";
    class?: string;
} = $props();

let open = $state(false);
let wrapEl: HTMLSpanElement;
const tipId = `m3e-tooltip-${Math.random().toString(36).slice(2, 9)}`;

// hover 延迟显示（官方 hover delay ~400ms），移开立即隐藏；焦点显示无延迟（无障碍）
let hoverTimer: ReturnType<typeof setTimeout> | null = null;
function onMouseEnter() {
	clearTimeout(hoverTimer);
	hoverTimer = setTimeout(() => (open = true), 400);
}
function onMouseLeave() {
	clearTimeout(hoverTimer);
	open = false;
}

// 键盘可达：插槽内元素聚焦时显示（M3 规范要求 tooltip 键盘可访问）
function onFocusIn(e: FocusEvent) {
    const target = e.target as HTMLElement | null;
    if (target && wrapEl.contains(target)) {
        target.setAttribute("aria-describedby", tipId);
        open = true;
    }
}

function onFocusOut(e: FocusEvent) {
    const target = e.target as HTMLElement | null;
    target?.removeAttribute("aria-describedby");
    const related = e.relatedTarget as Node | null;
    if (!related || !wrapEl.contains(related)) open = false;
}

function onActionClick() {
    action?.onClick();
    open = false;
}
</script>

<span
    class={`m3-tooltip m3-tooltip--${variant} ${className}${placement === "top" ? " m3-tooltip--top" : ""}${open ? " m3-tooltip--open" : ""}`}
    bind:this={wrapEl}
    onmouseenter={onMouseEnter}
    onmouseleave={onMouseLeave}
    onfocusin={onFocusIn}
    onfocusout={onFocusOut}
>
    <slot />
    <span class="m3-tooltip__tip" id={tipId} role="tooltip">
        {#if variant === "rich"}
            {#if title}
                <span class="m3-tooltip__title">{title}</span>
            {/if}
            {#if supporting}
                <span class="m3-tooltip__supporting">{supporting}</span>
            {/if}
            {#if action}
                <button type="button" class="m3-tooltip__action" onclick={onActionClick}>{action.label}</button>
            {/if}
        {:else}
            {label}
        {/if}
    </span>
</span>

<style lang="stylus">
.m3-tooltip
    position: relative
    display: inline-flex

    &__tip
        position: absolute
        top: calc(100% + 0.5rem)
        left: 50%
        transform: translate(-50%, 0.25rem)
        max-width: 18rem
        padding: 0.375rem 0.75rem
        border-radius: var(--shape-corner-xs)
        background: var(--inverse-surface)
        color: var(--inverse-on-surface)
        font: var(--m3e-type-body-small)
        text-align: left
        white-space: nowrap
        overflow-wrap: anywhere
        z-index: 50
        opacity: 0
        pointer-events: none
        transition: opacity var(--m3e-duration-short) var(--m3e-easing-standard)

    /* 显示由 JS 控制（hover 延迟 400ms，focus 立即） */
    &--open &__tip
        opacity: 1
        transform: translate(-50%, 0)

    /* 向上弹出（placement="top"）：锚点上方，入场方向反向。
       选择器沿用 & 拼接（字面类名会被 Svelte unused-CSS 剥离） */
    &--top
        .m3-tooltip__tip
            top: auto
            bottom: calc(100% + 0.5rem)
            transform: translate(-50%, -0.25rem)
        &.m3-tooltip--open .m3-tooltip__tip
            transform: translate(-50%, 0)

    /* rich：surface-container + elevation-2 + 结构列 */
    &--rich &__tip
        display: flex
        flex-direction: column
        gap: 0.25rem
        max-width: 20rem
        padding: 1rem
        border-radius: var(--shape-corner-m)
        background: var(--surface-container)
        color: var(--on-surface)
        box-shadow: var(--m3e-elevation-2)
        white-space: normal

    &__title
        font: var(--m3e-type-title-small)
        color: var(--on-surface-variant)

    &__supporting
        font: var(--m3e-type-body-medium)
        color: var(--on-surface-variant)

    &__action
        align-self: flex-start
        margin-top: 0.25rem
        padding: 0.25rem 0.5rem
        border: none
        background: none
        color: var(--primary)
        font: var(--m3e-type-label-large)
        cursor: pointer
        border-radius: var(--shape-corner-xs)
        &:hover
            background: unquote("color-mix(in srgb, var(--primary) 8%, transparent)")
        &:focus-visible
            outline: 2px solid var(--primary)
            outline-offset: 2px
</style>

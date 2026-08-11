<script lang="ts">
/**
 * M3E Menu — M3 菜单原子（受控容器）。
 * 父级持有触发器与定位（渲染时可用 class 控制位置/显隐）；
 * 本组件负责容器样式、role="menu"、ESC 关闭与点击外部关闭。
 * 插槽内放 <button class="m3-menu-item"> 项（样式由本组件 :global 提供）。
 */
let {
	open = $bindable(false),
	label = "",
	class: className = "",
}: {
	open?: boolean;
	label?: string;
	class?: string;
} = $props();

let menuEl = $state<HTMLDivElement | undefined>();

// open 为 true 时挂 ESC + 外部点击关闭。
// 延迟一个宏任务再挂载：触发按钮本次点击（导致 open=true 的事件）会冒泡到
// document，若不延迟会被误判为「菜单外部点击」而立即关闭（真实点击下复现）。
$effect(() => {
	if (!open) return;
	const onKeydown = (e: KeyboardEvent) => {
		if (e.key === "Escape") open = false;
	};
	const onClick = (e: MouseEvent) => {
		if (menuEl && !menuEl.contains(e.target as Node)) open = false;
	};
	const timer = setTimeout(() => {
		document.addEventListener("keydown", onKeydown);
		document.addEventListener("click", onClick);
	}, 0);
	return () => {
		clearTimeout(timer);
		document.removeEventListener("keydown", onKeydown);
		document.removeEventListener("click", onClick);
	};
});
</script>

<div
    class="m3-menu {className}"
    class:closed={!open}
    role="menu"
    aria-label={label}
    bind:this={menuEl}
>
    <slot />
</div>

<style lang="stylus">
.m3-menu
    min-width: 7rem
    padding: 0.25rem
    border-radius: var(--shape-corner-l)
    background: var(--surface-container)
    box-shadow: var(--m3e-elevation-2)
    max-height: 20rem
    overflow-y: auto
    transition: opacity var(--m3e-duration-short) var(--m3e-easing-standard), visibility var(--m3e-duration-short) var(--m3e-easing-standard)

    /* 关闭时自隐藏（父级仅需控制 open 与定位） */
    &.closed
        visibility: hidden
        opacity: 0
        pointer-events: none

    :global(.m3-menu-item)
        display: flex
        align-items: center
        gap: 0.5rem
        width: 100%
        height: 2.5rem
        padding: 0 1rem
        border: none
        border-radius: var(--shape-corner-s)
        background: transparent
        color: var(--on-surface)
        font: var(--m3e-type-label-large)
        text-align: left
        white-space: nowrap
        cursor: pointer
        &:hover
            background: unquote("color-mix(in oklab, var(--on-surface) 8%, transparent)")
        &:focus-visible
            outline: 2px solid var(--primary)
            outline-offset: -2px

    /* 选中态（M3 菜单规范）：调用方给菜单项加 .selected，如 LightDarkSwitch 当前模式 */
    :global(.m3-menu-item.selected)
        background: var(--secondary-container)
        color: var(--on-secondary-container)
</style>

<script lang="ts">
/**
 * M3E NavigationRail — 侧边导航栏原子（官方 NavigationRail.kt 移植）。
 * 80dp 宽容器（官方 NavigationRailCollapsedTokens.NarrowContainerWidth，
 * 背景 surface），垂直排列 items + 可选 header 插槽。
 * Item：56×32 指示器 pill（官方 BaselineItemTokens.ActiveIndicatorWidth/Height，
 * secondary-container 全圆，只包图标），选中 scaleX 0→1 生长动画；
 * icon 24px + label（label-medium）gap 4dp（官方 VerticalItemTokens）。
 *
 * 用法：<NavigationRail items={[{value,label,icon}]} bind:value={tab} />
 *      <NavigationRail items={items} bind:value={tab}>
 *          {#snippet header()}<头像/Logo>{/snippet}
 *      </NavigationRail>
 */
import Icon from "@iconify/svelte";

let {
	items = [],
	value = $bindable(""),
	label = "导航",
	header,
	class: className = "",
}: {
	items: { value: string; label: string; icon?: string }[];
	value?: string;
	label?: string;
	/** header 插槽（顶部，通常 FAB/头像/Logo） */
	header?: import("svelte").Snippet;
	class?: string;
} = $props();
</script>

<div class="m3-nav-rail {className}" role="navigation" aria-label={label}>
    {#if header}
        <div class="m3-nav-rail__header">{@render header()}</div>
    {/if}
    <div class="m3-nav-rail__items">
        {#each items as item (item.value)}
            <button
                type="button"
                class="m3-nav-rail__item"
                class:m3-nav-rail__item--active={value === item.value}
                aria-current={value === item.value ? "page" : undefined}
                onclick={() => (value = item.value)}
            >
                <span class="m3-nav-rail__indicator" aria-hidden="true"></span>
                <span class="m3-nav-rail__icon" aria-hidden="true">
                    <Icon icon={item.icon ?? "material-symbols:circle"}></Icon>
                </span>
                <span class="m3-nav-rail__label">{item.label}</span>
            </button>
        {/each}
    </div>
</div>

<style lang="stylus">
.m3-nav-rail
    display: flex
    flex-direction: column
    align-items: center
    gap: 12px
    width: 80px
    min-height: 100%
    box-sizing: border-box
    padding: 12px 0
    background: var(--surface)
    color: var(--on-surface)

    &__header
        display: flex
        flex-direction: column
        align-items: center

    &__items
        display: flex
        flex-direction: column
        gap: 12px

    /* item：64dp 高（官方 BaselineItemTokens ContainerHeight 64），
       内容（icon + label）整体垂直居中（与底部导航同布局），
       gap 8px：pill 底 36 与 label 顶 40 留 ~4px 间距 */
    &__item
        position: relative
        display: flex
        flex-direction: column
        align-items: center
        justify-content: center
        gap: 8px
        width: 72px
        height: 64px
        box-sizing: border-box
        border: none
        background: none
        cursor: pointer
        &:focus-visible
            outline: 2px solid var(--secondary)
            outline-offset: -2px

    /* 指示器 pill（官方 BaselineItemTokens 56×32 全圆，只包图标）：
       active 时 scaleX 0→1 生长；top 4px 使 pill 中心与 icon 中心对齐
       （内容居中布局，icon 在 pill 内垂直居中，无偏移违和感） */
    &__indicator
        position: absolute
        top: 4px
        left: 50%
        transform: translateX(-50%) scaleX(0)
        width: 56px
        height: 32px
        border-radius: var(--shape-corner-full)
        background: var(--secondary-container)
        transition: transform var(--m3e-duration-medium) var(--m3e-easing-emphasized-decelerate)

    &__item--active &__indicator
        transform: translateX(-50%) scaleX(1)

    &__icon
        position: relative
        display: flex
        color: var(--on-surface-variant)
        transition: color var(--m3e-duration-short) var(--m3e-easing-standard)
        > :global(svg)
            width: 1.5rem
            height: 1.5rem

    &__item--active &__icon
        color: var(--on-secondary-container)

    &__label
        position: relative
        font: var(--m3e-type-label-medium)
        color: var(--on-surface-variant)
        white-space: nowrap
        transition: color var(--m3e-duration-short) var(--m3e-easing-standard)

    &__item--active &__label
        color: var(--secondary)
</style>

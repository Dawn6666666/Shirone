<script lang="ts">
/**
 * M3E FABMenu — 悬浮菜单原子（M3 Expressive 2025，移植自 Compose
 * FloatingActionButtonMenu）。FAB 触发器 + 菜单列组合；触发器展开时
 * 圆角 16→28（全圆）、图标 add→close 且缩小、容器色 primary-container→primary。
 * 菜单项由调用方通过 .m3-fab-menu-item 类提供（56px、图标+文字）。
 *
 * 用法：
 *   <FABMenu bind:expanded={open} label="菜单">
 *     <button class="m3-fab-menu-item" onclick={...}>
 *       <Icon icon="material-symbols:edit" /> 编辑
 *     </button>
 *     <button class="m3-fab-menu-item" onclick={...}>
 *       <Icon icon="material-symbols:delete" /> 删除
 *     </button>
 *   </FABMenu>
 */
import Icon from "@iconify/svelte";

let {
    expanded = $bindable(false),
    icon = "material-symbols:add",
    iconExpanded = "material-symbols:close",
    label = "",
    class: className = "",
}: {
    expanded?: boolean;
    icon?: string;
    iconExpanded?: string;
    label?: string;
    class?: string;
} = $props();
</script>

<div
    class="m3-fab-menu {className}"
    class:m3-fab-menu--expanded={expanded}
>
    <div class="m3-fab-menu__items" aria-hidden={!expanded}>
        <slot />
    </div>
    <button
        type="button"
        class="m3-fab-menu__fab m3-state-layer"
        aria-haspopup="menu"
        aria-expanded={expanded}
        aria-label={label}
        onclick={() => (expanded = !expanded)}
    >
        <Icon icon={expanded ? iconExpanded : icon}></Icon>
    </button>
</div>

<style lang="stylus">
.m3-fab-menu
    position: relative
    display: inline-flex
    flex-direction: column
    align-items: flex-end

    /* 菜单列：FAB 上方展开 */
    &__items
        position: absolute
        bottom: 100%
        margin-bottom: 0.5rem
        display: flex
        flex-direction: column
        align-items: flex-end
        gap: 0.25rem
        white-space: nowrap

    &__fab
        display: flex
        align-items: center
        justify-content: center
        width: 3.5rem
        height: 3.5rem
        border: none
        border-radius: var(--shape-corner-l)
        background: var(--primary-container)
        color: var(--on-primary-container)
        --m3e-state-color: var(--on-primary-container)
        box-shadow: var(--m3e-elevation-3)
        cursor: pointer
        transition: border-radius var(--m3e-duration-medium) var(--m3e-easing-emphasized-decelerate), background-color var(--m3e-duration-medium) var(--m3e-easing-standard), color var(--m3e-duration-medium) var(--m3e-easing-standard)
        > :global(svg)
            width: 1.5rem
            height: 1.5rem
            transition: width var(--m3e-duration-medium) var(--m3e-easing-emphasized-decelerate), height var(--m3e-duration-medium) var(--m3e-easing-emphasized-decelerate)

    /* 展开：全圆角 + primary 容器 + 图标缩至 20px 变 close */
    &--expanded &__fab
        border-radius: var(--shape-corner-full)
        background: var(--primary)
        color: var(--on-primary)
        --m3e-state-color: var(--on-primary)
        > :global(svg)
            width: 1.25rem
            height: 1.25rem

    /* 菜单项（调用方提供） */
    :global(.m3-fab-menu-item)
        display: flex
        align-items: center
        gap: 0.5rem
        min-width: 3.5rem
        height: 3.5rem
        padding: 0 1.5rem
        border: none
        border-radius: var(--shape-corner-l)
        background: var(--primary-container)
        color: var(--on-primary-container)
        font: var(--m3e-type-title-medium)
        text-align: left
        white-space: nowrap
        cursor: pointer
        box-shadow: var(--m3e-elevation-1)
        transition: opacity var(--m3e-duration-medium) var(--m3e-easing-standard), transform var(--m3e-duration-medium) var(--m3e-easing-emphasized-decelerate)
        opacity: 0
        transform: translateY(0.5rem)
        > :global(svg)
            width: 1.5rem
            height: 1.5rem
            flex-shrink: 0

    /* stagger：逐项延迟淡入上移 */
    &--expanded :global(.m3-fab-menu-item)
        opacity: 1
        transform: none
    &--expanded :global(.m3-fab-menu-item:nth-child(1))
        transition-delay: 30ms
    &--expanded :global(.m3-fab-menu-item:nth-child(2))
        transition-delay: 60ms
    &--expanded :global(.m3-fab-menu-item:nth-child(3))
        transition-delay: 90ms
    &--expanded :global(.m3-fab-menu-item:nth-child(4))
        transition-delay: 120ms
    &--expanded :global(.m3-fab-menu-item:nth-child(5))
        transition-delay: 150ms
    &--expanded :global(.m3-fab-menu-item:nth-child(6))
        transition-delay: 180ms
</style>

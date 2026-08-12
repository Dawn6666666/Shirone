<script lang="ts">
/**
 * M3E FABMenu — 悬浮菜单原子（M3 Expressive 2025，移植自 Compose
 * FloatingActionButtonMenu + ToggleFloatingActionButton）。
 *
 * 变体：
 * - size：small(56)/medium(80)/large(96)，展开时统一收缩到 56 全圆 + close 图标
 * - align：end（默认，右对齐）/ start（左对齐）
 * - containerColor：收起容器色（默认 primary-container），展开变 primary
 * - 图标 Crossfade 切换（add ↔ close）
 * 菜单项由调用方通过 .m3-fab-menu-item 类提供（56px 全圆、图标 18px + body-medium）。
 *
 * 用法：
 *   <FABMenu bind:expanded={open} label="菜单" size="medium" align="start">
 *     <button class="m3-fab-menu-item" onclick={...}>
 *       <Icon icon="material-symbols:edit" /> 编辑
 *     </button>
 *   </FABMenu>
 */
import Icon from "@iconify/svelte";
import { onMount } from "svelte";
import {
	MENU_EXCLUSIVE_EVENT,
	announceMenuOpened,
	nextMenuInstanceId,
} from "@utils/menu-bus";

let {
    expanded = $bindable(false),
    icon = "material-symbols:add",
    iconExpanded = "material-symbols:close",
    label = "",
    size = "small",
    align = "end",
    containerColor = "var(--primary-container)",
    containerContentColor = "var(--on-primary-container)",
    exclusive = true,
    class: className = "",
}: {
    expanded?: boolean;
    icon?: string;
    iconExpanded?: string;
    label?: string;
    size?: "small" | "medium" | "large";
    align?: "end" | "start" | "center";
    containerColor?: string;
    containerContentColor?: string;
    exclusive?: boolean;
    class?: string;
} = $props();

const instanceId = nextMenuInstanceId();

// 互斥单开：展开时广播，其他同总线实例自动收起
$effect(() => {
    if (!exclusive || !expanded) return;
    const t = setTimeout(() => announceMenuOpened(instanceId), 0);
    return () => clearTimeout(t);
});

onMount(() => {
    const onExclusive = (e: Event) => {
        const detail = (e as CustomEvent).detail;
        if (detail?.instanceId !== instanceId && expanded) expanded = false;
    };
    document.addEventListener(MENU_EXCLUSIVE_EVENT, onExclusive);
    return () => document.removeEventListener(MENU_EXCLUSIVE_EVENT, onExclusive);
});
</script>

<div
    class="m3-fab-menu m3-fab-menu--{size} m3-fab-menu--{align} {className}"
    class:m3-fab-menu--expanded={expanded}
    style={`--fab-container-color: ${containerColor}; --fab-on-container-color: ${containerContentColor}`}
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
        <span class="m3-fab-menu__icon" class:m3-fab-menu__icon--hidden={expanded}>
            <Icon icon={icon}></Icon>
        </span>
        <span class="m3-fab-menu__icon" class:m3-fab-menu__icon--hidden={!expanded}>
            <Icon icon={iconExpanded}></Icon>
        </span>
    </button>
</div>

<style lang="stylus">
.m3-fab-menu
    position: relative
    display: inline-flex
    flex-direction: column

    /* 菜单列：FAB 上方展开 */
    &__items
        position: absolute
        bottom: 100%
        margin-bottom: 0.5rem
        display: flex
        flex-direction: column
        gap: 0.25rem
        white-space: nowrap

    /* FAB 触发器：尺寸/圆角/图标随 expanded 变形（展开收缩到 56 全圆） */
    &__fab
        display: flex
        align-items: center
        justify-content: center
        width: var(--fab-size)
        height: var(--fab-size)
        border: none
        border-radius: var(--fab-radius)
        background: var(--fab-container-color)
        color: var(--fab-on-container-color)
        --m3e-state-color: var(--fab-on-container-color)
        box-shadow: var(--m3e-elevation-3)
        cursor: pointer
        transition:
            width var(--m3e-duration-medium) var(--m3e-easing-emphasized-decelerate),
            height var(--m3e-duration-medium) var(--m3e-easing-emphasized-decelerate),
            border-radius var(--m3e-duration-medium) var(--m3e-easing-emphasized-decelerate),
            background-color var(--m3e-duration-medium) var(--m3e-easing-standard),
            color var(--m3e-duration-medium) var(--m3e-easing-standard)

    &--expanded &__fab
        width: 3.5rem
        height: 3.5rem
        border-radius: var(--shape-corner-full)
        background: var(--primary)
        color: var(--on-primary)
        --m3e-state-color: var(--on-primary)

    /* 图标 Crossfade：两个图标叠放，随 expanded 淡入淡出，尺寸随 --fab-icon */
    &__icon
        position: absolute
        display: flex
        opacity: 1
        transition: opacity var(--m3e-duration-short) var(--m3e-easing-standard)
        > :global(svg)
            width: var(--fab-icon)
            height: var(--fab-icon)
            transition: width var(--m3e-duration-medium) var(--m3e-easing-emphasized-decelerate), height var(--m3e-duration-medium) var(--m3e-easing-emphasized-decelerate)

    &__icon--hidden
        opacity: 0

    &--expanded &__icon > :global(svg)
        width: 1.25rem
        height: 1.25rem

    /* === 尺寸三档（官方 FabBaseline/FabMedium/FabLargeTokens） === */
    &--small
        --fab-size: 3.5rem
        --fab-radius: 16px
        --fab-icon: 1.5rem
    &--medium
        --fab-size: 5rem
        --fab-radius: 20px
        --fab-icon: 1.75rem
    &--large
        --fab-size: 6rem
        --fab-radius: 28px
        --fab-icon: 2.25rem

    /* === 对齐变体（官方 horizontalAlignment + center） === */
    &--end
        align-items: flex-end
        .m3-fab-menu__items
            align-items: flex-end
    &--start
        align-items: flex-start
        .m3-fab-menu__items
            align-items: flex-start
    &--center
        align-items: center
        .m3-fab-menu__items
            left: 50%
            transform: translateX(-50%)

    /* 菜单项（调用方提供）：56px 全圆、图标 18px + body-medium */
    :global(.m3-fab-menu-item)
        display: flex
        align-items: center
        gap: 0.5rem
        min-width: 3.5rem
        height: 3.5rem
        padding: 0 1.5rem
        border: none
        border-radius: var(--shape-corner-full)
        background: var(--primary-container)
        color: var(--on-primary-container)
        font: var(--m3e-type-body-medium)
        text-align: left
        white-space: nowrap
        cursor: pointer
        box-shadow: var(--m3e-elevation-1)
        transition: opacity var(--m3e-duration-medium) var(--m3e-easing-standard), transform var(--m3e-duration-medium) var(--m3e-easing-emphasized-decelerate)
        opacity: 0
        transform: translateY(0.5rem)
        > :global(svg)
            width: 1.125rem
            height: 1.125rem
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

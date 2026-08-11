<script lang="ts">
/**
 * M3E Snackbar — M3 提示条原子。
 * 消费 --inverse-surface / --inverse-on-surface（终于用上这两个角色），
 * 由全局事件总线（utils/snackbar.ts）驱动，纯 JS 环境也能触发。
 * 需挂载在 Layout 中：<Snackbar client:only="svelte" />
 */
import { SNACKBAR_EVENT } from "@utils/snackbar";
import { onMount } from "svelte";

let message = $state("");
let visible = $state(false);
let timer: ReturnType<typeof setTimeout> | null = null;

function show(msg: string) {
    message = msg;
    visible = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => (visible = false), 3500);
}

onMount(() => {
    const listener = (e: Event) => {
        const detail = (e as CustomEvent<{ message?: string }>).detail;
        if (detail?.message) show(detail.message);
    };
    window.addEventListener(SNACKBAR_EVENT, listener);
    return () => window.removeEventListener(SNACKBAR_EVENT, listener);
});
</script>

<div class="m3-snackbar" class:visible={visible} role="status" aria-live="polite">
    <span>{message}</span>
</div>

<style lang="stylus">
.m3-snackbar
    position: fixed
    left: 50%
    bottom: 1.5rem
    transform: translate(-50%, 1rem)
    display: flex
    align-items: center
    min-height: 3rem
    padding: 0.875rem 1rem
    max-width: min(calc(100vw - 2rem), 40rem)
    border-radius: var(--shape-corner-s)
    background: var(--inverse-surface)
    color: var(--inverse-on-surface)
    font: var(--m3e-type-body-medium)
    box-shadow: var(--m3e-elevation-3)
    opacity: 0
    pointer-events: none
    transition: opacity var(--m3e-duration-medium) var(--m3e-easing-emphasized-decelerate), transform var(--m3e-duration-medium) var(--m3e-easing-emphasized-decelerate)
    z-index: 100

    &.visible
        opacity: 1
        transform: translate(-50%, 0)
        pointer-events: auto
</style>

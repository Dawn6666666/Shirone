<script lang="ts">
/**
 * M3E Dialog — M3 对话框原子。
 * open 受控（$bindable）；点 scrim / ESC 关闭；打开时聚焦容器。
 * 进场 scrim fade + 内容 scale 展开；关闭时播放退场动画后再卸载。
 * 用法：<Dialog bind:open={show} title="标题">内容</Dialog>
 *      <svelte:fragment slot="actions">按钮区</svelte:fragment>
 */
import { tick } from "svelte";

let {
	open = $bindable(false),
	title = "",
}: {
	open?: boolean;
	title?: string;
} = $props();

let dialogEl = $state<HTMLDivElement | undefined>();
// closing：退场动画中；rendering：实际渲染（退场完成后才卸载）
let rendering = $state(false);
let closing = $state(false);

function close() {
	open = false;
}

function onKeydown(e: KeyboardEvent) {
	if (e.key === "Escape") {
		close();
	}
}

$effect(() => {
	if (open) {
		rendering = true;
		closing = false;
		// 等 DOM 渲染后聚焦（官方打开聚焦，保证 ESC 可接收）
		tick().then(() => dialogEl?.focus());
	} else if (rendering) {
		closing = true;
	}
});

// 退场动画结束（content scale down + scrim fade）后真正卸载
function onAnimationEnd() {
	if (closing) {
		rendering = false;
		closing = false;
	}
}
</script>

{#if rendering}
    <div class="m3-dialog-scrim" class:closing={closing} role="presentation" onclick={close}></div>
    <div
        class="m3-dialog"
        class:closing={closing}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabindex="-1"
        bind:this={dialogEl}
        onkeydown={onKeydown}
        onanimationend={onAnimationEnd}
    >
        {#if title}
            <div class="m3-dialog__title">{title}</div>
        {/if}
        <div class="m3-dialog__content">
            <slot />
        </div>
        <div class="m3-dialog__actions">
            <slot name="actions" />
        </div>
    </div>
{/if}

<style lang="stylus">
.m3-dialog-scrim
    position: fixed
    inset: 0
    z-index: 90
    background: unquote("color-mix(in srgb, var(--mc-scrim, #000) 32%, transparent)")
    animation: m3-dialog-fade-in var(--m3e-duration-medium) var(--m3e-easing-standard)

    &.closing
        animation: m3-dialog-fade-out var(--m3e-duration-medium) var(--m3e-easing-standard) forwards

.m3-dialog
    position: fixed
    left: 50%
    top: 50%
    transform: translate(-50%, -50%)
    z-index: 91
    min-width: 17.5rem
    max-width: calc(100vw - 3rem)
    border-radius: var(--shape-corner-xl)
    background: var(--surface-container-high)
    color: var(--on-surface)
    box-shadow: var(--m3e-elevation-3)
    padding: 1.5rem
    animation: m3-dialog-in var(--m3e-duration-medium) var(--m3e-easing-emphasized-decelerate)
    &:focus
        outline: none

    &.closing
        animation: m3-dialog-out var(--m3e-duration-medium) var(--m3e-easing-emphasized-accelerate) forwards

    &__title
        font: var(--m3e-type-headline-small)
        color: var(--on-surface)
        margin-bottom: 1rem

    &__content
        font: var(--m3e-type-body-medium)
        color: var(--on-surface-variant)

    &__actions
        display: flex
        justify-content: flex-end
        gap: 0.5rem
        margin-top: 1.5rem

@keyframes m3-dialog-fade-in
    from
        opacity: 0
    to
        opacity: 1

@keyframes m3-dialog-fade-out
    from
        opacity: 1
    to
        opacity: 0

@keyframes m3-dialog-in
    from
        opacity: 0
        transform: translate(-50%, -50%) scale(0.9)
    to
        opacity: 1
        transform: translate(-50%, -50%) scale(1)

@keyframes m3-dialog-out
    from
        opacity: 1
        transform: translate(-50%, -50%) scale(1)
    to
        opacity: 0
        transform: translate(-50%, -50%) scale(0.9)
</style>

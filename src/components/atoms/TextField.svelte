<script lang="ts">
/**
 * M3E TextField — M3 填充式文本输入原子（Svelte，可嵌入 Svelte 组件）。
 * 容器 --surface-container-high、底部主色下划线（focus 时亮起），
 * 前导图标用命名插槽：<svelte:fragment slot="leading">...</svelte:fragment>
 */
let {
    type = "text",
    placeholder = "",
    value = $bindable(""),
    name = "",
    id = "",
    label = "",
    onfocus = () => {},
    oninput = () => {},
    class: className = "",
}: {
    type?: string;
    placeholder?: string;
    value?: string;
    name?: string;
    id?: string;
    label?: string;
    onfocus?: () => void;
    oninput?: () => void;
    class?: string;
} = $props();
</script>

<div class="m3-text-field {className}">
    <span class="m3-text-field__icon"><slot name="leading" /></span>
    <input {type} {name} {id} bind:value {placeholder} aria-label={label} {onfocus} {oninput} />
    <span class="m3-text-field__underline" aria-hidden="true"></span>
</div>

<style lang="stylus">
.m3-text-field
    position: relative
    display: flex
    align-items: center
    height: 3rem
    padding: 0 1rem
    gap: 0.75rem
    border-radius: var(--shape-corner-m)
    background: var(--surface-container-high)
    color: var(--on-surface)
    font: var(--m3e-type-body-large)
    transition: background-color var(--m3e-duration-short) var(--m3e-easing-standard)

    &:hover
        background: unquote("color-mix(in oklab, var(--on-surface) 12%, var(--surface-container-high))")

    &:focus-within
        background: unquote("color-mix(in oklab, var(--on-surface) 16%, var(--surface-container-high))")

    &__icon
        display: flex
        align-items: center
        color: var(--on-surface-variant)
        font-size: 1.25rem
        line-height: 1

    input
        flex: 1
        min-width: 0
        background: transparent
        border: none
        outline: none
        color: var(--on-surface)
        caret-color: var(--primary)
        font: inherit
        &::placeholder
            color: var(--on-surface-variant)

    &__underline
        position: absolute
        left: 0.5rem
        right: 0.5rem
        bottom: 0.25rem
        height: 2px
        border-radius: var(--shape-corner-full)
        background: var(--primary)
        opacity: 0
        transform: scaleX(0.5)
        transition: opacity var(--m3e-duration-short) var(--m3e-easing-standard), transform var(--m3e-duration-short) var(--m3e-easing-emphasized-decelerate)

    &:focus-within &__underline
        opacity: 1
        transform: scaleX(1)
</style>

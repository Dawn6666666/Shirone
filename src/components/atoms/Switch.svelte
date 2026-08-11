<script lang="ts">
/**
 * M3E Switch — M3 开关原子。
 * 原生 <input type="checkbox"> 提供无障碍与键盘支持，自绘 track/thumb。
 * 用法：<Switch bind:checked={setting} label="Enable X" />
 */
let {
    checked = $bindable(false),
    disabled = false,
    label = "",
}: {
    checked?: boolean;
    disabled?: boolean;
    label?: string;
} = $props();
</script>

<label class="m3-switch" class:disabled={disabled}>
    <input
        type="checkbox"
        bind:checked
        {disabled}
        aria-label={label}
        class="m3-switch__input"
    />
    <span class="m3-switch__track m3-state-layer">
        <span class="m3-switch__thumb"></span>
    </span>
</label>

<style lang="stylus">
.m3-switch
    display: inline-flex
    cursor: pointer
    -webkit-tap-highlight-color: transparent

    &.disabled
        opacity: 0.38
        pointer-events: none

    /* 隐藏原生 checkbox（保留可访问性） */
    &__input
        position: absolute
        width: 1px
        height: 1px
        opacity: 0
        overflow: hidden
        clip: rect(0 0 0 0)
        white-space: nowrap
        clip-path: inset(50%)

    /* checkbox 聚焦时给 track 描边（:focus-visible 无法直接作用于 label） */
    &__input:focus-visible ~ &__track
        outline: 2px solid var(--primary)
        outline-offset: 2px

    &__track
        position: relative
        width: 3.25rem
        height: 2rem
        border-radius: var(--shape-corner-full)
        border: 2px solid var(--outline)
        box-sizing: border-box
        background: var(--surface-container-highest)
        transition: background-color var(--m3e-duration-medium) var(--m3e-easing-standard), border-color var(--m3e-duration-medium) var(--m3e-easing-standard)

    &__thumb
        position: absolute
        top: 50%
        left: 2px
        width: 1rem
        height: 1rem
        border-radius: var(--shape-corner-full)
        background: var(--outline)
        transform: translateY(-50%)
        transition: left var(--m3e-duration-medium) var(--m3e-easing-emphasized-decelerate), background-color var(--m3e-duration-medium) var(--m3e-easing-standard)

    &__input:checked ~ &__track
        background: var(--primary)
        border-color: var(--primary)

    &__input:checked ~ &__track &__thumb
        left: 2rem
        background: var(--on-primary)
</style>

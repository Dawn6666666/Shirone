<script lang="ts">
/**
 * M3E SegmentedButton — M3 分段按钮原子（单选语义）。
 * 容器 --surface-container，选中段 --secondary-container。
 * 用法：<SegmentedButton options={[{value, label}]} bind:value={spec} />
 */
let {
    options = [],
    value = $bindable(""),
    label = "",
    disabled = false,
}: {
    options: { value: string; label: string }[];
    value?: string;
    label?: string;
    disabled?: boolean;
} = $props();
</script>

<div class="m3-segmented" role="group" aria-label={label}>
    {#each options as opt (opt.value)}
        <label
            class="m3-segmented__segment"
            class:selected={value === opt.value}
        >
            <input
                type="radio"
                name={label}
                value={opt.value}
                bind:group={value}
                {disabled}
                hidden
            />
            <span>{opt.label}</span>
        </label>
    {/each}
</div>

<style lang="stylus">
.m3-segmented
    display: flex
    gap: 2px
    padding: 2px
    border-radius: var(--shape-corner-m)
    background: var(--surface-container)

    &__segment
        flex: 1
        display: flex
        align-items: center
        justify-content: center
        height: 2rem
        padding: 0 0.75rem
        border-radius: var(--shape-corner-s)
        font: var(--m3e-type-label-medium)
        color: var(--on-surface-variant)
        cursor: pointer
        user-select: none
        text-align: center
        line-height: 1.25
        transition: background-color var(--m3e-duration-short) var(--m3e-easing-standard), color var(--m3e-duration-short) var(--m3e-easing-standard), box-shadow var(--m3e-duration-short) var(--m3e-easing-standard)

        &:hover
            background: unquote("color-mix(in oklab, var(--on-surface) 8%, transparent)")

        &.selected
            background: var(--secondary-container)
            color: var(--on-secondary-container)
            box-shadow: var(--m3e-elevation-1)

        &:has(input:focus-visible)
            outline: 2px solid var(--primary)
            outline-offset: 1px
</style>

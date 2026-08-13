<script lang="ts">
	/**
	 * M3E 通用原子 — Avatar 头像。
	 * 图片加载失败或未提供时回退为文字（首字母 / 自定义 fallback）。
	 */
	let {
		src = "",
		alt = "",
		/** 直径（px），默认 40 */
		size = 40,
		/** 形状：circle 圆形（默认）/ rounded 圆角方形 / square 方形 */
		shape = "circle",
		/** 无图 / 加载失败时的回退文字（默认取 alt 首字符） */
		fallback = "",
		class: className = "",
	}: {
		src?: string;
		alt?: string;
		size?: number;
		shape?: "circle" | "rounded" | "square";
		fallback?: string;
		class?: string;
	} = $props();

	let failed = $state(false);
	const style = `--m3e-avatar-size: ${size}px`;
	const initial = fallback || (alt.trim() ? alt.trim()[0] : "?");
</script>

<div
	class="m3-avatar m3-avatar--{shape} {className}"
	{style}
	role={alt ? "img" : undefined}
	aria-label={alt || undefined}
>
	{#if src && !failed}
		<img src={src} alt={alt} loading="lazy" onerror={() => (failed = true)} />
	{:else}
		<span class="m3-avatar__fallback">{initial}</span>
	{/if}
</div>

<style lang="stylus">
.m3-avatar
	display: inline-flex
	align-items: center
	justify-content: center
	flex-shrink: 0
	width: var(--m3e-avatar-size)
	height: var(--m3e-avatar-size)
	overflow: hidden
	background: var(--surface-container-high)
	color: var(--on-surface-variant)
	user-select: none

	&--circle
		border-radius: var(--shape-corner-full)
	&--rounded
		border-radius: var(--shape-corner-m)
	&--square
		border-radius: 0

	> img
		display: block
		width: 100%
		height: 100%
		object-fit: cover

	&__fallback
		font: var(--m3e-type-title-medium)
		font-weight: 700
</style>

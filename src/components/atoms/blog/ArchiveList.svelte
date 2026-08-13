<script lang="ts">
	/**
	 * M3E 博客原子 — ArchiveList 归档列表（按年份分组）。
	 * 数据驱动：groups 为 { year, items: { title, href, date, tags? } }[]；
	 * 年份头 + 时间轴节点行，hover 标题变 primary 并右移。
	 * Svelte 实现：ArchivePanel（Svelte）与 Astro 演示页均可复用。
	 */
	export interface ArchiveItem {
		title: string;
		href: string;
		/** 展示日期（如 "08-13"） */
		date: string;
		tags?: string[];
	}
	export interface ArchiveGroup {
		year: number;
		items: ArchiveItem[];
	}

	let {
		groups = [],
		/** 单复数文案回调，如 (n) => `${n} 篇` */
		countLabel = (count: number) => `${count} 篇`,
		class: className = "",
	}: {
		groups?: ArchiveGroup[];
		countLabel?: (count: number) => string;
		class?: string;
	} = $props();
</script>

<div class="m3-blog-archive {className}">
	{#each groups as g (g.year)}
		<section class="m3-blog-archive__group">
			<header class="m3-blog-archive__header">
				<span class="m3-blog-archive__year">{g.year}</span>
				<span class="m3-blog-archive__dot" aria-hidden="true"></span>
				<span class="m3-blog-archive__count">{countLabel(g.items.length)}</span>
			</header>
			<ul class="m3-blog-archive__list">
				{#each g.items as it (it.href)}
					<li>
						<a class="m3-blog-archive__item" href={it.href} aria-label={it.title}>
							<span class="m3-blog-archive__date">{it.date}</span>
							<span class="m3-blog-archive__node" aria-hidden="true"></span>
							<span class="m3-blog-archive__title">{it.title}</span>
							{#if it.tags && it.tags.length > 0}
								<span class="m3-blog-archive__tags">{it.tags.map((t) => `#${t}`).join(" ")}</span>
							{/if}
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/each}
</div>

<style lang="stylus">
.m3-blog-archive
	&__group + &__group
		margin-top: 1.5rem

	&__header
		display: flex
		align-items: center
		gap: 1rem
		height: 3.75rem

	&__year
		min-width: 3.5rem
		text-align: right
		font: var(--m3e-type-title-large)
		font-weight: 700
		color: var(--on-surface)

	&__dot
		flex-shrink: 0
		width: 0.75rem
		height: 0.75rem
		border-radius: var(--shape-corner-full)
		border: 3px solid var(--primary)
		background: var(--surface)

	&__count
		font: var(--m3e-type-body-small)
		color: var(--on-surface-variant)

	&__list
		display: flex
		flex-direction: column
		list-style: none
		margin: 0
		padding: 0

	&__item
		display: flex
		align-items: center
		gap: 0.75rem
		width: 100%
		min-height: 2.5rem
		padding: 0.25rem 0.5rem
		border-radius: var(--shape-corner-s)
		text-decoration: none
		transition: background-color var(--m3e-duration-short) var(--m3e-easing-standard)
		&:hover
			background: unquote("color-mix(in oklab, var(--on-surface) 5%, transparent)")

	&__date
		flex-shrink: 0
		width: 4rem
		font: var(--m3e-type-body-small)
		color: var(--on-surface-variant)

	&__node
		flex-shrink: 0
		width: 0.375rem
		height: 0.375rem
		border-radius: var(--shape-corner-full)
		background: var(--on-surface-variant)
		transition:
			background-color var(--m3e-duration-short) var(--m3e-easing-standard),
			transform var(--m3e-duration-short) var(--m3e-easing-emphasized-decelerate)
		.m3-blog-archive__item:hover &
			background: var(--primary)
			transform: scale(1.6)

	&__title
		flex: 1
		min-width: 0
		overflow: hidden
		text-overflow: ellipsis
		white-space: nowrap
		font: var(--m3e-type-body-medium)
		font-weight: 700
		color: var(--on-surface)
		transition:
			color var(--m3e-duration-short) var(--m3e-easing-standard),
			transform var(--m3e-duration-short) var(--m3e-easing-emphasized-decelerate)
		.m3-blog-archive__item:hover &
			color: var(--primary)
			transform: translateX(0.25rem)

	&__tags
		flex-shrink: 1
		min-width: 0
		overflow: hidden
		text-overflow: ellipsis
		white-space: nowrap
		max-width: 20%
		font: var(--m3e-type-body-small)
		color: var(--on-surface-variant)
		@media (max-width: 768px)
			display: none
</style>

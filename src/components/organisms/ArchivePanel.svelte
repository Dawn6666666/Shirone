<script lang="ts">
	/**
	 * 归档面板：时间轴列表（年份折叠见 ArchiveList 原子）。
	 * URL 参数（?category= / ?tag= / ?uncategorized）驱动筛选（进入即过滤）。
	 * 有筛选时顶部显示筛选头（面包屑）：索引页链接 › 当前筛选值，
	 * 一键回溯到分类/标签索引页；无筛选时保持纯时间轴。
	 */
	import ArchiveList from "@components/atoms/blog/ArchiveList.svelte";
	import Card from "@components/atoms/display/Card.svelte";
	import Icon from "@iconify/svelte";
	import I18nKey from "@i18n/i18nKey";
	import { i18n } from "@i18n/translation";
	import { getPostUrlBySlug, url } from "@utils/url-utils";
	import { onMount } from "svelte";

	interface Post {
		slug: string;
		data: {
			title: string;
			tags: string[];
			category: string | null;
			published: Date;
		};
	}

	let { sortedPosts = [] as Post[] }: { sortedPosts?: Post[] } = $props();

	let category = $state("");
	let tag = $state("");
	let uncategorized = $state(false);
	let groups = $state<
		{
			year: number;
			items: {
				title: string;
				href: string;
				date: string;
				category?: string;
				tags: string[];
			}[];
		}[]
	>([]);

	/** 筛选头数据：类别（决定索引链接）+ 展示值；无筛选为 null */
	const filterCrumb = $derived.by(() => {
		if (uncategorized) {
			return {
				href: url("/categories/"),
				label: i18n(I18nKey.categories),
				value: i18n(I18nKey.uncategorized),
			};
		}
		if (category) {
			return {
				href: url("/categories/"),
				label: i18n(I18nKey.categories),
				value: category,
			};
		}
		if (tag) {
			return {
				href: url("/tags/"),
				label: i18n(I18nKey.tags),
				value: `#${tag}`,
			};
		}
		return null;
	});

	function formatDate(date: Date) {
		const month = (date.getMonth() + 1).toString().padStart(2, "0");
		const day = date.getDate().toString().padStart(2, "0");
		return `${month}-${day}`;
	}

	function countLabel(count: number) {
		return `${count} ${i18n(count === 1 ? I18nKey.postCount : I18nKey.postsCount)}`;
	}

	function buildGroups() {
		let filtered: Post[] = sortedPosts;
		if (uncategorized) {
			filtered = filtered.filter((p) => !p.data.category);
		}
		if (category) {
			filtered = filtered.filter((p) => p.data.category === category);
		}
		if (tag) {
			filtered = filtered.filter((p) => p.data.tags.includes(tag));
		}
		const grouped = filtered.reduce(
			(acc, post) => {
				const year = post.data.published.getFullYear();
				if (!acc[year]) {
					acc[year] = [];
				}
				acc[year].push(post);
				return acc;
			},
			{} as Record<number, Post[]>,
		);

		groups = Object.keys(grouped)
			.map((yearStr) => {
				const year = Number.parseInt(yearStr, 10);
				return {
					year,
					items: grouped[year].map((post) => ({
						title: post.data.title,
						href: getPostUrlBySlug(post.slug),
						date: formatDate(post.data.published),
						category: post.data.category ?? undefined,
						tags: post.data.tags,
					})),
				};
			})
			.sort((a, b) => b.year - a.year);
	}

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		category = params.get("category") || "";
		tag = params.get("tag") || "";
		uncategorized = params.has("uncategorized");
		buildGroups();
	});
</script>

<Card color="var(--card-bg)" radius="l" class="archive-panel px-8 py-6">
	{#if filterCrumb}
		<nav class="archive-panel__crumb" aria-label="Breadcrumb">
			<ol class="archive-panel__crumb-list">
				<li class="archive-panel__crumb-item">
					<a class="archive-panel__crumb-link m3-state-layer" href={filterCrumb.href}>
						{filterCrumb.label}
					</a>
				</li>
				<li class="archive-panel__crumb-separator" aria-hidden="true">
					<Icon icon="material-symbols:chevron-right-rounded" />
				</li>
				<li class="archive-panel__crumb-current">
					<span
						class="archive-panel__crumb-value"
						aria-current="page"
						title={filterCrumb.value}
					>{filterCrumb.value}</span>
				</li>
			</ol>
		</nav>
	{/if}
	<ArchiveList {groups} {countLabel} />
</Card>

<style lang="stylus">
@import "../../styles/breakpoints.styl"

:global(.archive-panel)
	@media (max-width: bp-sm - 1px)
		padding: 1rem

.archive-panel
	:global(&__crumb)
		min-width: 0
		padding: 0 0.25rem 0.875rem
		margin-bottom: 1.25rem
		border-bottom: 1px solid var(--outline-variant)

	:global(&__crumb-list)
		display: flex
		align-items: center
		min-width: 0
		margin: 0
		padding: 0
		list-style: none

	:global(&__crumb-item)
		flex-shrink: 0

	:global(&__crumb-link)
		display: inline-flex
		align-items: center
		min-height: 2rem
		padding: 0 0.5rem
		margin-left: -0.5rem
		border-radius: var(--shape-corner-m)
		color: var(--on-surface-variant)
		font: var(--m3e-type-label-medium)
		font-weight: 600
		text-decoration: none
		--m3e-state-color: var(--primary)
		> :global(svg)
			width: 1.125rem
			height: 1.125rem
		&:hover
			color: var(--primary)

	:global(&__crumb-separator)
		display: inline-flex
		align-items: center
		justify-content: center
		flex-shrink: 0
		width: 1.5rem
		color: var(--outline)
		> :global(svg)
			width: 1rem
			height: 1rem

	:global(&__crumb-current)
		display: block
		min-width: 0

	:global(&__crumb-value)
		display: block
		min-width: 0
		overflow: hidden
		text-overflow: ellipsis
		white-space: nowrap
		color: var(--primary)
		font: var(--m3e-type-body-medium)
		font-weight: 600

	@media (max-width: bp-sm - 1px)
		:global(&__crumb)
			padding-inline: 0
			padding-bottom: 0.75rem
			margin-bottom: 1rem
</style>

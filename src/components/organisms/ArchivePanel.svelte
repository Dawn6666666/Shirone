<script lang="ts">
	/**
	 * 归档面板：时间轴列表（年份折叠见 ArchiveList 原子）。
	 * URL 参数（?category= / ?tag=）驱动筛选，仅在有筛选时显示轻量筛选条
	 * （当前筛选值 + 计数 + 清除），平时保持纯列表，不叠加多余控件。
	 */
	import IconButton from "@components/atoms/action/IconButton.svelte";
	import ArchiveList from "@components/atoms/blog/ArchiveList.svelte";
	import Card from "@components/atoms/display/Card.svelte";
	import I18nKey from "@i18n/i18nKey";
	import { i18n } from "@i18n/translation";
	import { getPostUrlBySlug } from "@utils/url-utils";
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
	let initialized = false;

	const hasFilter = $derived(Boolean(category) || Boolean(tag));
	const visibleCount = $derived(
		groups.reduce((sum, g) => sum + g.items.length, 0),
	);

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

	function pushUrl() {
		const params = new URLSearchParams(window.location.search);
		params.delete("category");
		params.delete("tag");
		params.delete("uncategorized");
		if (category) params.set("category", category);
		if (tag) params.set("tag", tag);
		const qs = params.toString();
		history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
	}

	function clearFilter() {
		category = "";
		tag = "";
		pushUrl();
		buildGroups();
	}

	// 筛选变化 → 同步 URL 并重建列表
	$effect(() => {
		if (!initialized) return;
		pushUrl();
		buildGroups();
	});

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		category = params.get("category") || "";
		tag = params.get("tag") || "";
		buildGroups();
		initialized = true;
	});
</script>

<Card color="var(--card-bg)" radius="l" class="archive-panel px-8 py-6">
	{#if hasFilter}
		<div class="archive-filter-bar">
			<span class="archive-filter-bar__value">
				{#if category}
					{category}
				{:else if tag}
					#{tag}
				{/if}
			</span>
			<span class="archive-filter-bar__count">{countLabel(visibleCount)}</span>
			<IconButton
				icon="material-symbols:close"
				size="xsmall"
				label={i18n(I18nKey.reset)}
				class="archive-filter-bar__clear"
				onclick={clearFilter}
			/>
		</div>
	{/if}
	<ArchiveList {groups} {countLabel} />
</Card>

<style lang="stylus">
.archive-filter-bar
	display: flex
	align-items: center
	gap: 0.75rem
	margin-bottom: 0.5rem
	padding: 0.5rem 0.75rem
	border-radius: var(--shape-corner-m)
	background: var(--surface-container-low)

	&__value
		font: var(--m3e-type-label-large)
		font-weight: 600
		color: var(--primary)

	&__count
		flex: 1
		min-width: 0
		font: var(--m3e-type-body-small)
		color: var(--on-surface-variant)

	&__clear
		flex-shrink: 0

:global(.archive-panel)
	@media (max-width: 640px)
		padding: 1rem 0.75rem
</style>

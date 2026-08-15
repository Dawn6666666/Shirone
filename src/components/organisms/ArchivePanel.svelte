<script lang="ts">
	/**
	 * 归档面板：时间轴列表（年份折叠见 ArchiveList 原子）。
	 * URL 参数（?category= / ?tag=）驱动筛选（进入即过滤），
	 * 顶部不显示筛选横幅，保持纯时间轴列表。
	 */
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

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		category = params.get("category") || "";
		tag = params.get("tag") || "";
		buildGroups();
	});
</script>

<Card color="var(--card-bg)" radius="l" class="archive-panel px-8 py-6">
	<ArchiveList {groups} {countLabel} />
</Card>

<style lang="stylus">
@import "../../styles/breakpoints.styl"

:global(.archive-panel)
	@media (max-width: bp-sm - 1px)
		padding: 1rem 0.75rem
</style>

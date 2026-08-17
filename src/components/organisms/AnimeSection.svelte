<script lang="ts">
	/**
	 * 番剧页主体（有机体）：页头 + 状态筛选 chips + 双布局（list/grid）+ 加载更多。
	 * 数据由页面层经 utils/anime-data.getAnimeList() 构建期取得后以 props 传入；
	 * 筛选状态同步 URL（?status=），与友链/动态页同一交互语言。
	 *
	 * 布局形态跟随全局文章列表偏好（DisplaySettings 的 list/grid 段，
	 * localStorage `post-list-mode`，与 utils/layout-mode.ts 同一把锁）：
	 * - 挂载时读 getStoredMode()（无存储 = 站点默认 postListConfig.layout.mode）；
	 * - 设置面板切换后经 window LAYOUT_MODE_CHANGE_EVENT 同步（跨页面广播）；
	 * - 切类后逐卡 FLIP 平移（flipFromRect 共享原语），reduced-motion 直接跳变。
	 */
	import Button from "@components/atoms/action/Button.svelte";
	import Chips from "@components/atoms/action/Chips.svelte";
	import Card from "@components/atoms/display/Card.svelte";
	import LoadingIndicator from "@components/atoms/feedback/LoadingIndicator.svelte";
	import AnimeCard from "@components/molecules/AnimeCard.svelte";
	import PageHeader from "@components/molecules/PageHeader.svelte";
	import Icon from "@iconify/svelte";
	import I18nKey from "@i18n/i18nKey";
	import { i18n } from "@i18n/translation";
	import { ANIME_STATUS_META } from "@utils/anime-data";
	import { getStoredMode, LAYOUT_MODE_CHANGE_EVENT } from "@utils/layout-mode";
	import { flipFromRect } from "@utils/motion";
	import type { PostListMode } from "@/types/postListConfig";
	import type { AnimeItem } from "../../data/anime";
	import { onMount } from "svelte";

	let { animes = [] as AnimeItem[] }: { animes?: AnimeItem[] } = $props();

	const ANIME_PAGE_SIZE = 12;

	let selectedStatus = $state("");
	let shownCount = $state(ANIME_PAGE_SIZE);
	let initialized = false;
	/** 状态筛选过渡三段态：loading 展示指示器 → out 指示器淡出 → idle 列表 stagger 揭幕 */
	type FilterPhase = "idle" | "loading" | "out";
	let phase = $state<FilterPhase>("idle");
	let phaseTimers: ReturnType<typeof setTimeout>[] = [];

	/** 状态筛选 chips：只列数据中出现的状态（单选，再点取消 = 全部） */
	const statusItems = $derived(
		Array.from(new Set(animes.map((anime) => anime.status))).map((status) => ({
			value: status,
			label: i18n(ANIME_STATUS_META[status].key),
			leadingIcon: ANIME_STATUS_META[status].icon,
		})),
	);

	const filtered = $derived(
		selectedStatus ? animes.filter((anime) => anime.status === selectedStatus) : animes,
	);
	const visibleAnimes = $derived(filtered.slice(0, shownCount));
	const hasMore = $derived(filtered.length > shownCount);

	function countLabel(count: number) {
		return `${count} ${i18n(I18nKey.animeCounts)}`;
	}

	/** 状态筛选：指示器展示 → 淡出 → 网格 stagger 揭幕 */
	function onStatusChange() {
		phaseTimers.forEach(clearTimeout);
		phase = "loading";
		phaseTimers = [
			setTimeout(() => (phase = "out"), 300),
			setTimeout(() => (phase = "idle"), 300 + 150),
		];
	}

	// 筛选变化时重置已加载数（读依赖注册在前，避免首次 return 后失联）
	$effect(() => {
		const s = selectedStatus;
		if (!initialized) return;
		shownCount = ANIME_PAGE_SIZE;
	});

	// 筛选状态同步到 URL（?status=），刷新/分享/回退保留
	$effect(() => {
		const s = selectedStatus;
		if (!initialized) return;
		const params = new URLSearchParams(window.location.search);
		params.delete("status");
		if (s) params.set("status", s);
		const qs = params.toString();
		history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
	});

	// 布局形态：跟随全局文章列表偏好（client:only 岛，挂载即读存储，无闪变）
	const LIST_MODE_CLASS: Record<PostListMode, string> = {
		grid: "anime-list--grid",
		list: "anime-list--list",
	};
	let listMode = $state<PostListMode>(getStoredMode());
	let listEl = $state<HTMLElement | null>(null);

	/** 切布局：切类前记录卡片位置，下一帧逐卡 FLIP 平移（reduced-motion 跳变） */
	function applyLayoutMode(mode: PostListMode) {
		if (mode === listMode) return;
		// 限定在本组件列表容器内查询，避免误伤页面上其它 .anime-card（如侧栏 widget）
		const cards = Array.from(
			listEl?.querySelectorAll<HTMLElement>(".anime-card") ?? [],
		);
		const before = cards.map((card) => card.getBoundingClientRect());
		listMode = mode;
		requestAnimationFrame(() => {
			cards.forEach((card, index) => flipFromRect(card, before[index], 400));
		});
	}

	/** 设置面板广播（DisplaySettings 切换 list/grid 时派发） */
	function onLayoutEvent(event: Event) {
		const layout = (event as CustomEvent<{ layout: PostListMode }>).detail?.layout;
		if (layout === "list" || layout === "grid") applyLayoutMode(layout);
	}

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		selectedStatus = params.get("status") || "";
		initialized = true;
		window.addEventListener(LAYOUT_MODE_CHANGE_EVENT, onLayoutEvent);
		return () => {
			phaseTimers.forEach(clearTimeout);
			window.removeEventListener(LAYOUT_MODE_CHANGE_EVENT, onLayoutEvent);
		};
	});
</script>

<Card color="var(--card-bg)" radius="l" class="anime-section px-8 py-6">
	<PageHeader
		icon="material-symbols:live-tv-outline-rounded"
		title={i18n(I18nKey.anime)}
		subtitle={i18n(I18nKey.animeBanner)}
	/>

	{#if animes.length > 0}
		<div class="anime-section__tools">
			{#if statusItems.length > 1}
				<div class="anime-section__chips">
					<Chips
						items={statusItems}
						variant="filter"
						bind:value={selectedStatus}
						onchange={onStatusChange}
					/>
				</div>
			{/if}
			{#if filtered.length > 1}
				<p class="anime-section__count">{countLabel(filtered.length)}</p>
			{/if}
		</div>
	{/if}

	{#if phase !== "idle"}
		<!-- 状态筛选过渡：contained 指示器展示后淡出，再由网格 stagger 揭幕 -->
		<div
			class="anime-section__loading"
			class:anime-section__loading--out={phase === "out"}
		>
			<LoadingIndicator contained size={64} />
		</div>
	{:else if visibleAnimes.length > 0}
		{#key selectedStatus}
			<div class="anime-list {LIST_MODE_CLASS[listMode]}" bind:this={listEl}>
				{#each visibleAnimes as anime, i (anime.title)}
					<AnimeCard {anime} delay={Math.min(i, 7) * 45} />
				{/each}
			</div>
		{/key}
		{#if hasMore}
			<div class="anime-section__more">
				<Button
					variant="outlined"
					icon="material-symbols:expand-more-rounded"
					label={i18n(I18nKey.loadMore)}
					onclick={() => (shownCount += ANIME_PAGE_SIZE)}
				/>
			</div>
		{/if}
	{:else}
		<div class="anime-section__empty">
			<Icon icon="material-symbols:search-off-outline-rounded" aria-hidden="true" />
			<span>{i18n(I18nKey.animeNoResults)}</span>
		</div>
	{/if}
</Card>

<style lang="stylus">
@import "../../styles/breakpoints.styl"

/* 卡片容器作为容器查询宿主：网格列数按可用宽度自适应。
   主栏宽度受左右侧栏挤压（1280 视口下仅 ~600px），视口断点不可靠；
   注意 `.anime-section` 落在 Card 原子根上（无本组件 scope），必须 :global。 */
:global(.anime-section)
	container-type: inline-size

.anime-section
	&__tools
		display: flex
		flex-direction: column
		gap: 0.75rem
		padding-bottom: 1.25rem
		border-bottom: 1px solid var(--outline-variant)

	&__chips
		width: 100%

	&__count
		margin: 0
		color: var(--on-surface-variant)
		font: var(--m3e-type-body-small)

	/* 状态筛选过渡：区块位置的大号 contained LoadingIndicator（out = 淡出退场） */
	&__loading
		display: flex
		align-items: center
		justify-content: center
		min-height: 11rem
		padding-top: 1.5rem

		&--out
			animation: anime-loading-out var(--m3e-duration-short) var(--m3e-easing-emphasized-accelerate) both

	&__more
		display: flex
		justify-content: center
		margin-top: 1.25rem

	&__empty
		display: flex
		flex-direction: column
		align-items: center
		justify-content: center
		gap: 0.75rem
		min-height: 11rem
		padding-top: 1.5rem
		color: var(--on-surface-variant)
		font: var(--m3e-type-body-large)
		> :global(svg)
			width: 2.5rem
			height: 2.5rem

/* 海报网格（grid）：列数按容器宽度分档（30/48/64rem = 3/4/5 列，2 列兜底） */
.anime-list--grid
	display: grid
	grid-template-columns: repeat(2, 1fr)
	gap: 0.875rem
	padding-top: 1.25rem

@container (min-width: 30rem)
	.anime-list--grid
		grid-template-columns: repeat(3, 1fr)

@container (min-width: 48rem)
	.anime-list--grid
		grid-template-columns: repeat(4, 1fr)

@container (min-width: 64rem)
	.anime-list--grid
		grid-template-columns: repeat(5, 1fr)

/* 横向列表（list）：单列，超宽视口双列；卡片横排（封面固定宽 + 正文铺开）。
   跨组件边界覆盖卡片内部类，统一走 :global（容器级驱动，规则集中在布局拥有方）。 */
.anime-list--list
	display: grid
	grid-template-columns: 1fr
	gap: 0.875rem
	padding-top: 1.25rem

	@media (min-width: 88rem)
		grid-template-columns: repeat(2, 1fr)

	:global(.anime-card)
		flex-direction: row

	:global(.anime-card__cover)
		width: 8.5rem
		flex-shrink: 0

		@media (min-width: 48rem)
			width: 11rem

	:global(.anime-card__body)
		flex: 1
		min-width: 0
		justify-content: space-between

	:global(.anime-card__desc)
		-webkit-line-clamp: 3

@media (max-width: bp-sm - 1px)
	/* 卡片容器（Card 原子根）移动端收窄内边距 */
	:global(.anime-section)
		padding: 1rem 0.75rem

	.anime-list--grid, .anime-list--list
		padding-top: 1.25rem
		gap: 0.75rem

/* 指示器退场：淡出 + 轻微收拢（reduced-motion 由全局规则压至终态） */
@keyframes anime-loading-out
	from
		opacity: 1
		transform: none
	to
		opacity: 0
		transform: scale(0.96)
</style>

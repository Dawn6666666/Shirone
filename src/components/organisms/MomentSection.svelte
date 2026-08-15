<script lang="ts">
	/**
	 * 动态页主体（有机体）：页头 + 搜索/标签筛选 + 动态流 + 加载更多。
	 * 数据由页面层构建期渲染后以 props 传入（零运行时请求）；
	 * 筛选状态同步 URL（?q= / ?tag=），与友链页同一交互语言。
	 */
	import Button from "@components/atoms/action/Button.svelte";
	import Chips from "@components/atoms/action/Chips.svelte";
	import Card from "@components/atoms/display/Card.svelte";
	import LoadingIndicator from "@components/atoms/feedback/LoadingIndicator.svelte";
	import TextField from "@components/atoms/input/TextField.svelte";
	import MomentCard, { type MomentAuthor } from "@components/molecules/MomentCard.svelte";
	import PageHeader from "@components/molecules/PageHeader.svelte";
	import Icon from "@iconify/svelte";
	import I18nKey from "@i18n/i18nKey";
	import { i18n } from "@i18n/translation";
	import { initFancybox } from "@utils/fancybox-handler";
	import type { MomentItem } from "@utils/content-utils";
	import { onMount } from "svelte";

	let {
		moments = [] as MomentItem[],
		author = { name: "", avatar: "", url: "/about/" } as MomentAuthor,
	}: { moments?: MomentItem[]; author?: MomentAuthor } = $props();

	const MOMENTS_PAGE_SIZE = 10;

	let query = $state("");
	let selectedTag = $state("");
	let shownCount = $state(MOMENTS_PAGE_SIZE);
	let initialized = false;
	/** 分类（标签）筛选过渡态：短暂展示 LoadingIndicator，配合列表 stagger 入场 */
	let filtering = $state(false);
	let filterTimer: ReturnType<typeof setTimeout> | undefined;

	const tagItems = $derived(
		Array.from(new Set(moments.flatMap((moment) => moment.tags)))
			.sort((a, b) => a.localeCompare(b))
			.map((tag) => ({ value: tag, label: tag })),
	);

	/** HTML → 纯文本（搜索用），构建一次避免每键重复解析 */
	const searchTexts = $derived.by(() => {
		const map = new Map<string, string>();
		for (const moment of moments) {
			const plain = moment.html.replace(/<[^>]+>/g, " ");
			map.set(
				moment.id,
				[plain, moment.location, ...moment.tags].join(" ").toLowerCase(),
			);
		}
		return map;
	});

	const filtered = $derived.by(() => {
		const normalizedQuery = query.trim().toLowerCase();

		return moments.filter((moment) => {
			if (selectedTag && !moment.tags.includes(selectedTag)) return false;
			if (!normalizedQuery) return true;
			return (searchTexts.get(moment.id) ?? "").includes(normalizedQuery);
		});
	});

	const visibleMoments = $derived(filtered.slice(0, shownCount));
	const hasMore = $derived(filtered.length > shownCount);

	function countLabel(count: number) {
		return `${count} ${i18n(count === 1 ? I18nKey.momentsCount : I18nKey.momentsCounts)}`;
	}

	/** 分类（标签）筛选：短暂显示 LoadingIndicator 后淡入新列表 */
	function onTagChange() {
		filtering = true;
		clearTimeout(filterTimer);
		filterTimer = setTimeout(() => (filtering = false), 300);
	}

	// 筛选变化时重置已加载数（读依赖注册在前，避免首次 return 后失联）
	$effect(() => {
		const q = query;
		const t = selectedTag;
		if (!initialized) return;
		shownCount = MOMENTS_PAGE_SIZE;
	});

	// 筛选状态同步到 URL（?q= / ?tag=），刷新/分享/回退保留
	$effect(() => {
		const q = query;
		const t = selectedTag;
		if (!initialized) return;
		const params = new URLSearchParams(window.location.search);
		params.delete("q");
		params.delete("tag");
		if (q) params.set("q", q);
		if (t) params.set("tag", t);
		const qs = params.toString();
		history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
	});

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		query = params.get("q") || "";
		selectedTag = params.get("tag") || "";
		initialized = true;
		// 图片灯箱：client:only 岛挂载晚于全局 init，此处确保 [data-fancybox] 已绑定
		initFancybox();
		return () => clearTimeout(filterTimer);
	});
</script>

<Card color="var(--card-bg)" radius="l" class="moment-section px-8 py-6">
	<PageHeader
		icon="material-symbols:auto-awesome-outline-rounded"
		title={i18n(I18nKey.moments)}
		subtitle={i18n(I18nKey.momentsBanner)}
	/>

	{#if moments.length > 0}
		<div class="moment-section__tools">
			<div class="moment-section__search">
				<TextField
					type="search"
					bind:value={query}
					placeholder={i18n(I18nKey.search)}
					label={i18n(I18nKey.search)}
					hideLabel
					variant="outlined"
					class="!rounded-(--shape-corner-l)"
				>
					<Icon slot="leading" icon="material-symbols:search-rounded" aria-hidden="true" />
				</TextField>
				{#if query}
					<button
						type="button"
						class="moment-section__search-clear"
						aria-label={i18n(I18nKey.clear)}
						onclick={() => (query = "")}
					>
						<Icon icon="material-symbols:close-rounded" aria-hidden="true" />
					</button>
				{/if}
			</div>

			{#if tagItems.length > 0}
				<div class="moment-section__chips">
					<Chips
						items={tagItems}
						variant="filter"
						bind:value={selectedTag}
						onchange={onTagChange}
					/>
				</div>
			{/if}
			<p class="moment-section__count">{countLabel(filtered.length)}</p>
		</div>
	{/if}

	{#if filtering}
		<!-- 分类（标签）筛选过渡：区块位置显示大号 contained LoadingIndicator -->
		<div class="moment-section__loading">
			<LoadingIndicator contained size={64} />
		</div>
	{:else if visibleMoments.length > 0}
		{#key `${query}|${selectedTag}`}
			<div class="moment-section__list">
				{#each visibleMoments as moment, i (moment.id)}
					<MomentCard
						{moment}
						{author}
						style={`--moment-index: ${Math.min(i, 7)}`}
					/>
				{/each}
			</div>
		{/key}
		{#if hasMore}
			<div class="moment-section__more">
				<Button
					variant="outlined"
					icon="material-symbols:expand-more-rounded"
					label={i18n(I18nKey.loadMore)}
					onclick={() => (shownCount += MOMENTS_PAGE_SIZE)}
				/>
			</div>
		{/if}
	{:else}
		<div class="moment-section__empty">
			<Icon icon="material-symbols:search-off-outline-rounded" aria-hidden="true" />
			<span>{i18n(I18nKey.momentsNoResults)}</span>
		</div>
	{/if}
</Card>

<style lang="stylus">
@import "../../styles/breakpoints.styl"

.moment-section
	display: block

	&__tools
		display: flex
		flex-direction: column
		gap: 0.875rem
		padding-bottom: 1.5rem
		border-bottom: 1px solid var(--outline-variant)

	&__search
		position: relative
		width: 100%
		max-width: 32rem

		:global(.m3-text-field)
			width: 100%

	&__search-clear
		position: absolute
		right: 0.5rem
		top: 50%
		transform: translateY(-50%)
		display: inline-flex
		flex-shrink: 0
		align-items: center
		justify-content: center
		width: 1.75rem
		height: 1.75rem
		padding: 0.25rem
		border: none
		background: none
		color: var(--on-surface-variant)
		cursor: pointer
		border-radius: var(--shape-corner-full)
		> :global(svg)
			width: 1.25rem
			height: 1.25rem
		&:hover
			background: unquote("color-mix(in oklab, var(--on-surface-variant) 8%, transparent)")

	&__chips
		width: 100%

	&__count
		margin: 0
		color: var(--on-surface-variant)
		font: var(--m3e-type-body-small)

	&__list
		display: grid
		grid-template-columns: 1fr
		gap: 1rem
		padding-top: 1.5rem

		/* 逐卡 stagger 入场（reduced-motion 由全局 motion-reduced 规则禁用动画） */
		:global(.moment-card)
			animation: moment-fade-in var(--m3e-duration-medium) var(--m3e-easing-emphasized-decelerate) both
			animation-delay: calc(var(--moment-index, 0) * 45ms)

	/* 分类筛选过渡：区块位置的大号 contained LoadingIndicator */
	&__loading
		display: flex
		align-items: center
		justify-content: center
		min-height: 11rem
		padding-top: 1.5rem

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

	@media (max-width: bp-sm - 1px)
		padding: 1rem 0.75rem

		&__list
			padding-top: 1.25rem

/* 筛选结果淡入（reduced-motion 由全局 motion-reduced 规则禁用动画） */
@keyframes moment-fade-in
	from
		opacity: 0
		transform: translateY(0.25rem)
	to
		opacity: 1
		transform: translateY(0)
</style>

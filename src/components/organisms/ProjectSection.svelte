<script lang="ts">
/** 项目页主体（有机体）：按分类分组，沿用 Compass 的工具区与瓷砖网格。 */
import Chips from "@components/atoms/action/Chips.svelte";
import Card from "@components/atoms/display/Card.svelte";
import PageHeader from "@components/molecules/PageHeader.svelte";
import ProjectCard from "@components/molecules/ProjectCard.svelte";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import Icon from "@iconify/svelte";
import { packMasonry, setupMasonry } from "@utils/masonry";
import { onMount } from "svelte";
import type { ProjectCategory, ProjectItem } from "@/types/projectsConfig";

let {
	categories = [] as ProjectCategory[],
	items = [] as ProjectItem[],
}: { categories?: ProjectCategory[]; items?: ProjectItem[] } = $props();

let selectedCategory = $state("");
let gridEl: HTMLElement | undefined = $state();
const enabledItems = $derived(items.filter((item) => item.enable));
const activeCategories = $derived(
	categories.filter((category) =>
		enabledItems.some((item) => item.category === category.key),
	),
);
const categoryItems = $derived(
	activeCategories.map((category) => ({
		value: category.key,
		label: category.label,
		leadingIcon: category.icon ?? "",
	})),
);
const filteredItems = $derived(
	selectedCategory
		? enabledItems.filter((item) => item.category === selectedCategory)
		: enabledItems,
);

/** 瀑布流：复用文章列表的最短列打包（utils/masonry.ts）。
 * 有封面/无封面卡片高度天然混合，span 行数消除列间空洞；
 * ResizeObserver 处理换列数，过滤后的子项重建由 $effect 重排。 */
onMount(() => {
	if (!gridEl) return;
	setupMasonry(gridEl);
	document.fonts?.ready.then(() => packMasonry(gridEl)).catch(() => {});
});

$effect(() => {
	// 依赖 filteredItems：过滤变化后子项重建，需要重新打包
	filteredItems;
	if (gridEl) packMasonry(gridEl);
});
</script>

<Card color="var(--card-bg)" radius="l" class="projects-section px-8 py-6">
	<PageHeader
		icon="material-symbols:deployed-code-outline-rounded"
		title={i18n(I18nKey.projects)}
		subtitle={i18n(I18nKey.projectsBanner)}
	/>

	{#if enabledItems.length > 0}
		<div class="projects-section__tools">
			{#if categoryItems.length > 1}
				<div
					class="projects-section__chips"
					aria-label={i18n(I18nKey.projectCategories)}
				>
					<Chips items={categoryItems} variant="filter" bind:value={selectedCategory} />
				</div>
			{/if}
			<p class="projects-section__count">
				{filteredItems.length} {i18n(I18nKey.projectsCounts)}
			</p>
		</div>
	{/if}

	{#if filteredItems.length > 0}
		<div
			class="projects-section__grid"
			aria-live="polite"
			bind:this={gridEl}
		>
			{#each filteredItems as project, index (project.key)}
				<ProjectCard {project} delay={Math.min(index, 7) * 45} />
			{/each}
		</div>
	{:else}
		<div class="projects-section__empty">
			<Icon icon="material-symbols:folder-off-outline-rounded" aria-hidden="true" />
			<span>{i18n(I18nKey.projectsNoResults)}</span>
		</div>
	{/if}
</Card>

<style lang="stylus">
@import "../../styles/breakpoints.styl"

.projects-section
	display: block

	@media (max-width: bp-sm - 1px)
		padding: 1rem 0.75rem

	&__tools
		display: flex
		flex-direction: column
		gap: 0.875rem
		padding-bottom: 1.25rem
		border-bottom: 1px solid var(--outline-variant)

	&__chips
		width: 100%

	&__count
		margin: 0
		color: var(--on-surface-variant)
		font: var(--m3e-type-body-small)

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
	&__grid
		display: grid
		grid-template-columns: minmax(0, 1fr)
		gap: 0.625rem
		margin-top: 1.25rem

		/* 瀑布流：仅 ≥md（单列下 packMasonry 自动清空定位，保持普通行距）。
		   约定与 PostPage/masonry.ts 同步：auto-rows 8px、row-gap 0、
		   行距 16px 烘焙进 span（column-gap 与 ROW_GAP 同值） */
		@media (min-width: bp-md)
			grid-template-columns: repeat(auto-fill, minmax(min(100%, 18rem), 1fr))
			align-items: start
			grid-auto-rows: 8px
			row-gap: 0
			column-gap: var(--m3e-space-4)
</style>

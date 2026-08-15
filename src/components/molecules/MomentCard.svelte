<script lang="ts">
	/**
	 * 动态卡片（分子）：单条动态的展示单元。
	 * <article> 语义（非整卡链接）；头像/作者名链到作者页；
	 * 正文为构建期渲染的 HTML（复用全局 .custom-md 排版）；
	 * 图片网格按数量自适应（1 单图 / 2-4 双列 / 5+ 三列封顶 6 块 +N 折叠），
	 * 点击进全站 Fancybox 灯箱（data-fancybox 按条目分组）。
	 */
	import Avatar from "@components/atoms/display/Avatar.svelte";
	import Icon from "@iconify/svelte";
	import I18nKey from "@i18n/i18nKey";
	import { i18n } from "@i18n/translation";
	import { formatDateToYYYYMMDDHHmm } from "@utils/date-utils";
	import type { MomentItem } from "@utils/content-utils";

	export type MomentAuthor = {
		name: string;
		avatar: string;
		url: string;
	};

	let {
		moment,
		author,
		class: className = "",
	}: {
		moment: MomentItem;
		author: MomentAuthor;
		class?: string;
	} = $props();

	const MAX_TILES = 6;

	const publishedAt = $derived(new Date(moment.published));
	const timeText = $derived(formatDateToYYYYMMDDHHmm(publishedAt));
	/** 5+ 图封顶 6 块，超出折叠为 +N 遮罩 */
	const visibleImages = $derived(
		moment.images.length > MAX_TILES ? moment.images.slice(0, MAX_TILES) : moment.images,
	);
	const remainder = $derived(
		moment.images.length > MAX_TILES ? moment.images.length - MAX_TILES : 0,
	);
	const gridVariant = $derived.by(() => {
		if (moment.images.length === 1) return "single";
		/* 3 图走「1 大 + 2 小」拼图，避免双列网格的 2+1 孤儿行 */
		if (moment.images.length === 3) return "mosaic";
		if (moment.images.length <= 4) return "pair";
		return "trio";
	});
</script>

<article class="moment-card {className}" id="moment-{moment.id}">
	<header class="moment-card__header">
		<a class="moment-card__author" href={author.url}>
			<!-- 作者名紧邻头像可读，头像按装饰图处理（避免与 aria-label 冗余） -->
			<Avatar src={author.avatar} alt="" size={40} shape="circle" />
			<span class="moment-card__name">{author.name}</span>
		</a>

		<div class="moment-card__badges">
			{#if moment.mood}
				<span class="moment-card__badge" aria-hidden="true">
					<Icon icon={moment.mood} />
				</span>
			{/if}
			{#if moment.pinned}
				<span class="moment-card__badge moment-card__badge--pinned">
					<Icon icon="material-symbols:push-pin-rounded" aria-hidden="true" />
					{i18n(I18nKey.pinned)}
				</span>
			{/if}
		</div>

		<time class="moment-card__time" datetime={moment.published}>{timeText}</time>
	</header>

	{#if moment.html.trim()}
		<div class="moment-card__content custom-md">
			<!-- 正文为构建期渲染产物（站点 markdown 插件链），非用户输入 -->
			{@html moment.html}
		</div>
	{/if}

	{#if moment.images.length > 0}
		<div class="moment-card__gallery moment-card__gallery--{gridVariant}">
			{#each visibleImages as image, index (image.src + index)}
				<figure
					class="moment-card__tile"
					class:moment-card__tile--single={gridVariant === "single"}
					class:moment-card__tile--hero={gridVariant === "mosaic" && index === 0}
				>
					<img
						src={image.src}
						alt={image.alt}
						loading="lazy"
						decoding="async"
						data-fancybox="moments-{moment.id}"
						data-caption={image.alt || undefined}
					/>
					{#if remainder > 0 && index === MAX_TILES - 1}
						<span class="moment-card__more">+{remainder}</span>
					{/if}
				</figure>
			{/each}
		</div>
	{/if}

	{#if moment.location || moment.tags.length > 0}
		<footer class="moment-card__footer">
			{#if moment.location}
				<span class="moment-card__location">
					<Icon icon="material-symbols:location-on-outline-rounded" aria-hidden="true" />
					{moment.location}
				</span>
			{/if}
			{#if moment.tags.length > 0}
				<div class="moment-card__tags">
					{#each moment.tags as tag (tag)}
						<span class="moment-card__tag">#{tag}</span>
					{/each}
				</div>
			{/if}
		</footer>
	{/if}
</article>

<style lang="stylus">
@import "../../styles/breakpoints.styl"

.moment-card
	display: flex
	flex-direction: column
	box-sizing: border-box
	width: 100%
	padding: 1rem 1.25rem
	border-radius: var(--shape-corner-l)
	background: var(--card-bg)
	border: 1px solid var(--outline-variant)
	color: var(--on-surface)

	&__header
		display: flex
		align-items: center
		gap: 0.75rem

	&__author
		display: inline-flex
		align-items: center
		gap: 0.625rem
		min-width: 0
		text-decoration: none
		border-radius: var(--shape-corner-full)
		&:focus-visible
			outline: 2px solid var(--primary)
			outline-offset: 2px

	&__name
		overflow: hidden
		text-overflow: ellipsis
		white-space: nowrap
		color: var(--on-surface)
		font: var(--m3e-type-title-small)
		font-weight: 600

	&__badges
		display: inline-flex
		align-items: center
		gap: 0.375rem
		flex-shrink: 0

	&__badge
		display: inline-flex
		align-items: center
		gap: 0.25rem
		padding: 0.1875rem 0.5rem
		border-radius: var(--shape-corner-full)
		background: var(--surface-container-high)
		color: var(--on-surface-variant)
		font: var(--m3e-type-label-small)
		> :global(svg)
			width: 1rem
			height: 1rem

		&--pinned
			background: var(--primary-container)
			color: var(--on-primary-container)

	&__time
		margin-left: auto
		flex-shrink: 0
		color: var(--on-surface-variant)
		font: var(--m3e-type-body-small)

	&__content
		margin-top: 0.75rem
		color: var(--on-surface)
		font: var(--m3e-type-body-medium)
		line-height: 1.75
		overflow-wrap: break-word
		:global(p:first-child)
			margin-top: 0
		:global(p:last-child)
			margin-bottom: 0

	&__gallery
		display: grid
		gap: 0.5rem
		margin-top: 0.875rem

		/* 桌面端限宽：多图网格的格子保持精致尺度，窄屏自然全宽 */
		&--pair
			grid-template-columns: repeat(2, 1fr)
			max-width: 30rem
		/* 3 图拼图：左大图跨两行 + 右侧两方格，整体拼成一个正方形 */
		&--mosaic
			grid-template-columns: 2fr 1fr
			grid-template-rows: 1fr 1fr
			max-width: 30rem
		&--trio
			grid-template-columns: repeat(3, 1fr)
			max-width: 38rem

	&__tile
		position: relative
		display: flex
		overflow: hidden
		border-radius: var(--shape-corner-m)
		aspect-ratio: 1
		background: var(--surface-container-high)
		margin: 0
		> img
			display: block
			width: 100%
			height: 100%
			object-fit: cover
			cursor: zoom-in

		/* 单图：固定 4:3 比例盒（限宽 30rem）。
		   不用自然尺寸：lazy 图片加载前无内在尺寸，fit-content 会塌成 0×0，
		   Chrome 对零尺寸元素的懒加载可能永不触发 */
		&--single
			aspect-ratio: 4 / 3
			width: 100%
			max-width: 30rem
			border-radius: var(--shape-corner-l)
			> img
				height: 100%
				object-fit: cover

		/* 拼图大图：跨两行由行高撑满（与右列两方格等比成正方形） */
		&--hero
			grid-row: span 2
			aspect-ratio: auto

	&__more
		position: absolute
		inset: 0
		display: flex
		align-items: center
		justify-content: center
		/* 图片折叠遮罩：站点规范允许的唯一固定黑/白叠加 */
		background: rgb(0 0 0 / 60%)
		color: rgb(255 255 255)
		font: var(--m3e-type-title-large)

	&__footer
		display: flex
		align-items: center
		justify-content: space-between
		gap: 0.75rem
		flex-wrap: wrap
		margin-top: 0.875rem

	&__location
		display: inline-flex
		align-items: center
		gap: 0.25rem
		color: var(--on-surface-variant)
		font: var(--m3e-type-label-small)
		> :global(svg)
			width: 1rem
			height: 1rem

	&__tags
		display: flex
		flex-wrap: wrap
		gap: 0.375rem

	&__tag
		color: var(--on-surface-variant)
		font: var(--m3e-type-label-small)

	@media (max-width: bp-sm - 1px)
		padding: 0.875rem 1rem
</style>

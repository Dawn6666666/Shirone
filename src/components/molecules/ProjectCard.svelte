<script lang="ts">
/**
 * 项目卡片（分子）：统一卡片壳 + 单一骨架，无断点分叉。
 * - 卡片壳对齐站点卡片语言（FriendCard/AnimeCard/SkillCard）：
 *   --card-bg + outline-variant 描边 + corner-l，hover 升级描边与 elevation-1；
 * - 有封面：通栏 16/9 媒体区（aspect-ratio 锁高 + object-fit: cover），
 *   任何宽度下图片都不可能撑高卡片，手机端不再被拉伸；
 *   加载前显示主题色渐变占位；封面可点（website）时整图外链；
 * - 无封面：回退为图标瓷砖头（图标 + 标题/阶段并排），不保留空图槽；
 * - 阶段为 tonal pill：语义色经 inline --project-phase-color 注入
 *   （shipped → tertiary / building → primary / exploring → secondary，
 *   与 ANIME_STATUS_META 的角色映射同源），避免动态 class 触发
 *   Svelte unused-CSS 剥离（见 rules/pitfalls.md 1.6）；
 * - 封面加载失败自动回退到图标形态，不破版。
 */
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import Icon from "@iconify/svelte";
import { reveal } from "@utils/motion";
import type { ProjectItem, ProjectPhase } from "@/types/projectsConfig";

let { project, delay = 0 }: { project: ProjectItem; delay?: number } = $props();

let coverFailed = $state(false);

const phaseMeta: Record<
	ProjectPhase,
	{ key: I18nKey; icon: string; color: string }
> = {
	shipped: {
		key: I18nKey.projectPhaseShipped,
		icon: "material-symbols:check-circle-outline-rounded",
		color: "var(--tertiary)",
	},
	building: {
		key: I18nKey.projectPhaseBuilding,
		icon: "material-symbols:construction-rounded",
		color: "var(--primary)",
	},
	exploring: {
		key: I18nKey.projectPhaseExploring,
		icon: "material-symbols:explore-outline-rounded",
		color: "var(--secondary)",
	},
};

const phase = $derived(phaseMeta[project.phase]);
const showCover = $derived(Boolean(project.cover) && !coverFailed);
</script>

{#snippet coverImage()}
	<img
		src={project.cover}
		alt={project.coverAlt ?? project.title}
		loading="lazy"
		decoding="async"
		onerror={() => (coverFailed = true)}
	/>
{/snippet}

<article
	class={`project-card ${showCover ? "project-card--with-cover" : "project-card--without-cover"} ${project.featured ? "project-card--featured" : ""}`}
	data-project={project.key}
	style={`--project-phase-color: ${phase.color};`}
	use:reveal={{ delay }}
>
	{#if showCover}
		{#if project.website}
			<a
				class="project-card__cover"
				href={project.website}
				target="_blank"
				rel="noopener noreferrer"
				aria-label={`${project.title} · ${i18n(I18nKey.projectVisit)}`}
			>
				{@render coverImage()}
			</a>
		{:else}
			<div class="project-card__cover">
				{@render coverImage()}
			</div>
		{/if}
	{/if}

	<div class="project-card__body">
		<div class="project-card__header">
			{#if !showCover}
				<span class="project-card__icon" aria-hidden="true">
					<Icon icon={project.icon ?? "material-symbols:deployed-code-outline-rounded"} />
				</span>
			{/if}

			<div class="project-card__heading">
				<div class="project-card__title-row">
					<h2 class="project-card__title">{project.title}</h2>
					{#if project.year}
						<span class="project-card__year">{project.year}</span>
					{/if}
				</div>
				<span class="project-card__phase" data-phase={project.phase}>
					<Icon icon={phase.icon} aria-hidden="true" />
					{i18n(phase.key)}
				</span>
			</div>
		</div>

		<p class="project-card__summary">{project.summary}</p>

		{#if project.technologies.length > 0}
			<ul
				class="project-card__technologies"
				aria-label={i18n(I18nKey.projectTechnologies)}
			>
				{#each project.technologies as technology (technology)}
					<li>{technology}</li>
				{/each}
			</ul>
		{/if}

		{#if project.website || project.repository}
			<div class="project-card__actions">
				{#if project.website}
					<a href={project.website} target="_blank" rel="noopener noreferrer">
						<Icon icon="material-symbols:open-in-new-rounded" aria-hidden="true" />
						{i18n(I18nKey.projectVisit)}
					</a>
				{/if}
				{#if project.repository}
					<a href={project.repository} target="_blank" rel="noopener noreferrer">
						<Icon icon="fa6-brands:github" aria-hidden="true" />
						{i18n(I18nKey.projectSource)}
					</a>
				{/if}
			</div>
		{/if}
	</div>
</article>

<style lang="stylus">
@import "../../styles/breakpoints.styl"

.project-card
	display: flex
	flex-direction: column
	box-sizing: border-box
	min-width: 0
	overflow: hidden
	background: var(--card-bg)
	border: 1px solid var(--outline-variant)
	border-radius: var(--shape-corner-l)
	transition:
		border-color var(--m3e-duration-medium) var(--m3e-easing-emphasized-decelerate),
		box-shadow var(--m3e-duration-medium) var(--m3e-easing-emphasized-decelerate),
		background-color var(--m3e-duration-medium) var(--m3e-easing-standard)

	&:hover
		border-color: var(--outline)
		box-shadow: var(--m3e-elevation-1)
		background: unquote("color-mix(in oklab, var(--on-surface) 3%, var(--card-bg))")

	/* 封面：16/9 稳定比例锁高，图片永远按 cover 裁切，杜绝纵向拉伸 */
	&__cover
		position: relative
		display: block
		width: 100%
		aspect-ratio: 16 / 9
		flex-shrink: 0
		overflow: hidden
		background: linear-gradient(160deg,
			unquote("color-mix(in oklab, var(--primary) 16%, var(--surface-container-low))"),
			var(--surface-container-high))
		text-decoration: none

		&:focus-visible
			outline: 2px solid var(--primary)
			outline-offset: -2px

		> img
			display: block
			width: 100%
			height: 100%
			object-fit: cover
			transition: transform var(--m3e-duration-long) var(--m3e-easing-emphasized-decelerate)

			.project-card:hover &
				transform: scale(1.04)

	&__body
		display: flex
		flex-direction: column
		flex: 1
		gap: 0.625rem
		min-width: 0
		padding: 0.875rem 1rem

	&__header
		display: flex
		align-items: center
		gap: 0.75rem
		min-width: 0

	/* 无封面紧凑变体：技术栈与源码操作合并一行，纵向节奏与有封面卡片对齐 */
	&--without-cover &__body
		display: grid
		grid-template-columns: minmax(0, 1fr) auto
		gap: 0.75rem 1rem
		padding: 1rem

	&--without-cover &__header,
	&--without-cover &__summary
		grid-column: 1 / -1

	&--without-cover &__summary
		min-height: 2.8em

	&--without-cover &__technologies
		align-self: center

	&--without-cover &__actions
		align-self: center
		justify-content: flex-end
		margin-top: 0
		padding-top: 0

	@media (max-width: 27.5rem)
		&--without-cover &__body
			grid-template-columns: minmax(0, 1fr)

		&--without-cover &__header,
		&--without-cover &__summary
			grid-column: 1

		&--without-cover &__actions
			justify-content: flex-start

	/* 图标瓷砖：无封面项目的视觉锚点（有封面时不渲染） */
	&__icon
		display: flex
		align-items: center
		justify-content: center
		width: 2.75rem
		height: 2.75rem
		flex-shrink: 0
		box-sizing: border-box
		border-radius: var(--shape-corner-m)
		background: unquote("color-mix(in oklab, var(--primary) 12%, var(--surface-container-highest))")
		color: var(--primary)
		transition: transform var(--m3e-duration-medium) var(--m3e-easing-emphasized-decelerate)

		> :global(svg)
			width: 1.5rem
			height: 1.5rem

		.project-card:hover &
			transform: translateY(-0.125rem)

	&__heading
		display: flex
		flex-direction: column
		flex: 1
		gap: 0.375rem
		min-width: 0

	&__title-row
		display: flex
		align-items: baseline
		justify-content: space-between
		gap: 0.75rem
		min-width: 0

	&__title
		margin: 0
		min-width: 0
		color: var(--on-surface)
		font: var(--m3e-type-title-small)
		font-weight: 600
		line-height: 1.25
		overflow-wrap: anywhere
		transition: color var(--m3e-duration-short) var(--m3e-easing-standard)

		.project-card:hover &
			color: var(--primary)

	&__year
		flex-shrink: 0
		color: var(--on-surface-variant)
		font: var(--m3e-type-label-small)
		font-variant-numeric: tabular-nums

	/* 阶段 tonal pill：语义色来自 inline --project-phase-color */
	&__phase
		display: inline-flex
		align-items: center
		align-self: flex-start
		gap: 0.25rem
		min-width: 0
		padding: 0.125rem 0.625rem
		border-radius: var(--shape-corner-full)
		background: unquote("color-mix(in oklab, var(--project-phase-color) 14%, transparent)")
		color: var(--project-phase-color)
		font: var(--m3e-type-label-small)
		font-weight: 600

		> :global(svg)
			width: 0.875rem
			height: 0.875rem
			flex-shrink: 0

	&__summary
		display: -webkit-box
		min-height: 2.8em
		margin: 0
		overflow: hidden
		-webkit-line-clamp: 2
		-webkit-box-orient: vertical
		color: var(--on-surface-variant)
		font: var(--m3e-type-body-small)
		line-height: 1.4

	&__technologies
		display: flex
		flex-wrap: wrap
		column-gap: 0.375rem
		row-gap: 0.125rem
		margin: 0
		padding: 0
		color: var(--on-surface-variant)
		font: var(--m3e-type-label-small)
		list-style: none

		li + li::before
			content: "·"
			margin-right: 0.375rem
			color: var(--outline)

	&__actions
		display: flex
		flex-wrap: wrap
		gap: 0.75rem
		margin-top: auto
		padding-top: 0.25rem

		a
			display: inline-flex
			align-items: center
			gap: 0.25rem
			color: var(--primary)
			font: var(--m3e-type-label-medium)
			text-decoration: none

			&:hover
				text-decoration: underline

			> :global(svg)
				width: 1rem
				height: 1rem
</style>

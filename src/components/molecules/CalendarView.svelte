<script lang="ts">
	/**
	 * 月度文章历交互视图（Calendar.astro 的水合岛）。
	 * 单月视图 + 切月 + 点击有文日展开当日文章；月/周名称由 Intl
	 * 按站点 locale 生成（本地化数据不占 i18n key）。
	 * 动效：切月网格 reveal 淡入、文章列表 collapse 展开（motion.ts
	 * 原语，reduced-motion 自动瞬切）。
	 */
	import IconButton from "@components/atoms/action/IconButton.svelte";
	import { collapse, reveal } from "@utils/motion";
	import type { CalendarPost } from "@utils/calendar-data";

	interface Props {
		/** BCP47 locale（由 siteConfig.lang 换算，Intl 用） */
		locale: string;
		startOfWeek: "mon" | "sun";
		/** dateKey（YYYY-MM-DD）→ 当日文章 */
		postsByDate: Record<string, CalendarPost[]>;
		backTodayLabel: string;
		prevMonthLabel: string;
		nextMonthLabel: string;
	}

	let {
		locale,
		startOfWeek = "mon",
		postsByDate,
		backTodayLabel,
		prevMonthLabel,
		nextMonthLabel,
	}: Props = $props();

	const today = new Date();
	let year = $state(today.getFullYear());
	let month = $state(today.getMonth());
	let selectedDate = $state<string | null>(null);

	const monthTitle = $derived(
		new Intl.DateTimeFormat(locale, { year: "numeric", month: "long" }).format(
			new Date(year, month, 1),
		),
	);

	// 周名：2021-01-03 是周日，由此锚定一周 7 天（Intl weekday short）
	const weekStartOffset = $derived(startOfWeek === "mon" ? 1 : 0);
	const weekdays = $derived(
		Array.from({ length: 7 }, (_, i) => {
			const day = (i + weekStartOffset) % 7;
			return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(
				new Date(2021, 0, 3 + day),
			);
		}),
	);

	const pad = (n: number) => String(n).padStart(2, "0");
	const dateKey = (y: number, m: number, d: number) =>
		`${y}-${pad(m + 1)}-${pad(d)}`;

	interface DayCell {
		day: number;
		key: string;
		posts: CalendarPost[];
	}

	const cells = $derived.by(() => {
		const first = new Date(year, month, 1).getDay();
		const daysInMonth = new Date(year, month + 1, 0).getDate();
		const leading = (first - weekStartOffset + 7) % 7;
		const result: (DayCell | null)[] = Array.from(
			{ length: leading },
			() => null,
		);
		for (let d = 1; d <= daysInMonth; d++) {
			const key = dateKey(year, month, d);
			result.push({ day: d, key, posts: postsByDate[key] ?? [] });
		}
		return result;
	});

	const selectedPosts = $derived(
		selectedDate ? (postsByDate[selectedDate] ?? []) : [],
	);
	const listOpen = $derived(selectedPosts.length > 0);

	const isCurrentMonth = $derived(
		year === today.getFullYear() && month === today.getMonth(),
	);

	function isTodayCell(cell: DayCell): boolean {
		return (
			cell.key === dateKey(today.getFullYear(), today.getMonth(), today.getDate())
		);
	}

	function shiftMonth(delta: number) {
		const next = new Date(year, month + delta, 1);
		year = next.getFullYear();
		month = next.getMonth();
		selectedDate = null;
	}

	function backToToday() {
		year = today.getFullYear();
		month = today.getMonth();
		selectedDate = null;
	}

	function toggleDay(cell: DayCell) {
		if (cell.posts.length === 0) return;
		selectedDate = selectedDate === cell.key ? null : cell.key;
	}
</script>

<div class="m3-calendar">
	<header class="m3-calendar__bar">
		<IconButton
			variant="standard"
			size="xsmall"
			icon="material-symbols:chevron-left-rounded"
			label={prevMonthLabel}
			onclick={() => shiftMonth(-1)}
		/>
		<button
			type="button"
			class="m3-calendar__title"
			class:m3-calendar__title--clickable={!isCurrentMonth}
			title={isCurrentMonth ? undefined : backTodayLabel}
			aria-label={isCurrentMonth ? monthTitle : `${monthTitle}（${backTodayLabel}）`}
			onclick={() => {
				if (!isCurrentMonth) backToToday();
			}}
		>
			{monthTitle}
		</button>
		<IconButton
			variant="standard"
			size="xsmall"
			icon="material-symbols:chevron-right-rounded"
			label={nextMonthLabel}
			onclick={() => shiftMonth(1)}
		/>
	</header>

	<div class="m3-calendar__weekdays" aria-hidden="true">
		{#each weekdays as weekday}
			<span class="m3-calendar__weekday">{weekday}</span>
		{/each}
	</div>

	{#key `${year}-${month}`}
		<div class="m3-calendar__grid" use:reveal={{ duration: 200 }}>
			{#each cells as cell}
				{#if cell === null}
					<span class="m3-calendar__blank" aria-hidden="true"></span>
				{:else}
					<button
						type="button"
						class={`m3-calendar__day${cell.posts.length > 0 ? " m3-calendar__day--has-posts" : ""}${isTodayCell(cell) ? " m3-calendar__day--today" : ""}${cell.key === selectedDate ? " m3-calendar__day--selected" : ""}`}
						disabled={cell.posts.length === 0}
						aria-current={isTodayCell(cell) ? "date" : undefined}
						aria-label={`${cell.key}${cell.posts.length > 0 ? `，${cell.posts.length} 篇文章` : ""}`}
						onclick={() => toggleDay(cell)}
					>
						{cell.day}
					</button>
				{/if}
			{/each}
		</div>
	{/key}

	<div class="m3-calendar__panel" use:collapse={{ open: listOpen }}>
		<ul class="m3-calendar__posts">
			{#each selectedPosts as post}
				<li class="m3-calendar__post">
					<a href={post.url}>{post.title}</a>
					<span class="m3-calendar__post-date">{post.date.slice(5)}</span>
				</li>
			{/each}
		</ul>
	</div>
</div>

<style lang="stylus">
	.m3-calendar
		display: flex
		flex-direction: column
		gap: 0.5rem

		&__bar
			display: flex
			align-items: center
			gap: 0.25rem

		&__title
			flex: 1
			min-width: 0
			margin: 0
			padding: 0.25rem 0.5rem
			border: none
			border-radius: var(--shape-corner-s)
			background: transparent
			text-align: center
			font: var(--m3e-type-title-small)
			font-weight: 600
			color: var(--on-surface)
			white-space: nowrap
			transition:
				color var(--m3e-duration-short) var(--m3e-easing-standard),
				background-color var(--m3e-duration-short) var(--m3e-easing-standard)

			&--clickable
				color: var(--primary)
				cursor: pointer

				&:hover
					background: var(--btn-plain-bg-hover)

		&__weekdays
			display: grid
			grid-template-columns: repeat(7, 1fr)
			gap: 0.25rem

		&__weekday
			text-align: center
			font: var(--m3e-type-label-medium)
			color: var(--on-surface-variant)

		&__grid
			display: grid
			grid-template-columns: repeat(7, 1fr)
			gap: 0.25rem

		&__blank
			aspect-ratio: 1

		&__day
			aspect-ratio: 1
			display: flex
			align-items: center
			justify-content: center
			border: none
			border-radius: var(--shape-corner-s)
			background: transparent
			font: var(--m3e-type-label-large)
			font-variant-numeric: tabular-nums
			color: var(--on-surface-variant)
			cursor: default
			transition: background-color var(--m3e-duration-short) var(--m3e-easing-standard)

			&--has-posts
				background: var(--primary-container)
				color: var(--on-primary-container)
				font-weight: 600
				cursor: pointer

				&:hover
					filter: brightness(1.06)

			&--today
				background: var(--primary)
				color: var(--on-primary)
				font-weight: 700

				&:hover
					filter: brightness(1.06)

			&--selected
				outline: 2px solid var(--outline)
				outline-offset: -2px

			&:disabled
				opacity: 0.55

		&__panel
			overflow: hidden

		&__posts
			list-style: none
			margin: 0
			padding: 0.25rem 0 0
			display: flex
			flex-direction: column
			gap: 0.125rem
			max-height: 9.5rem
			overflow-y: auto

		&__post
			display: flex
			align-items: baseline
			gap: 0.5rem
			padding: 0.25rem 0.5rem
			border-radius: var(--shape-corner-s)
			transition: background-color var(--m3e-duration-short) var(--m3e-easing-standard)

			&:hover
				background: var(--btn-plain-bg-hover)

			a
				min-width: 0
				flex: 1
				overflow: hidden
				text-overflow: ellipsis
				white-space: nowrap
				font: var(--m3e-type-body-medium)
				color: var(--on-surface)
				text-decoration: none
				transition: color var(--m3e-duration-short) var(--m3e-easing-standard)

			&:hover a
				color: var(--primary)

		&__post-date
			flex-shrink: 0
			font: var(--m3e-type-label-medium)
			color: var(--on-surface-variant)
			font-variant-numeric: tabular-nums
</style>

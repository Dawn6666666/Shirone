<script lang="ts">
	import Chips from "@components/atoms/action/Chips.svelte";
	import Card from "@components/atoms/display/Card.svelte";
	import TextField from "@components/atoms/input/TextField.svelte";
	import FriendCard from "@components/molecules/FriendCard.svelte";
	import Icon from "@iconify/svelte";
	import I18nKey from "@i18n/i18nKey";
	import { i18n } from "@i18n/translation";
	import type { FriendItem } from "../../data/friends";

	let { friends = [] as FriendItem[] }: { friends?: FriendItem[] } = $props();

	let query = $state("");
	let selectedTag = $state("");

	const tagItems = Array.from(new Set(friends.flatMap((friend) => friend.tags))).map(
		(tag) => ({ value: tag, label: tag }),
	);

	const filtered = $derived.by(() => {
		const normalizedQuery = query.trim().toLowerCase();

		return friends.filter((friend) => {
			if (selectedTag && !friend.tags.includes(selectedTag)) return false;
			if (!normalizedQuery) return true;

			let searchableHost = friend.siteurl;
			try {
				searchableHost = new URL(friend.siteurl).hostname;
			} catch {
				/* Keep the original URL when it cannot be parsed. */
			}

			return [friend.title, friend.desc, searchableHost, ...friend.tags].some(
				(value) => value.toLowerCase().includes(normalizedQuery),
			);
		});
	});
</script>

<Card color="var(--card-bg)" radius="l" class="friend-section px-8 py-6">
	{#if friends.length > 0}
		<div class="friend-section__tools">
			<div class="friend-section__search">
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
						class="friend-section__search-clear"
						aria-label={i18n(I18nKey.clear)}
						onclick={() => (query = "")}
					>
						<Icon icon="material-symbols:close-rounded" aria-hidden="true" />
					</button>
				{/if}
			</div>

			{#if tagItems.length > 0}
				<div class="friend-section__chips">
					<Chips items={tagItems} variant="filter" bind:value={selectedTag} />
				</div>
			{/if}
		</div>
	{/if}

	{#if filtered.length > 0}
		<div class="friend-section__list">
			{#each filtered as friend (friend.id)}
				<FriendCard {friend} />
			{/each}
		</div>
		<p class="friend-section__note">{i18n(I18nKey.friendsBanner)}</p>
	{:else}
		<div class="friend-section__empty">
			<Icon icon="material-symbols:search-off-outline-rounded" aria-hidden="true" />
			<span>{i18n(I18nKey.friendsNoResults)}</span>
		</div>
	{/if}
</Card>

<style lang="stylus">
@import "../../styles/breakpoints.styl"

.friend-section
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

	&__filters
		width: 100%

	&__list
		display: grid
		grid-template-columns: 1fr
		gap: 1rem
		padding-top: 1.5rem

		@media (min-width: bp-md)
			grid-template-columns: repeat(2, 1fr)

	&__empty
		display: flex
		flex-direction: column
		align-items: center
		justify-content: center
		gap: 0.75rem
		min-height: 11rem
		color: var(--on-surface-variant)
		font: var(--m3e-type-body-large)
		> :global(svg)
			width: 2.5rem
			height: 2.5rem

	&__note
		margin: 1.25rem 0 0
		color: var(--on-surface-variant)
		font: var(--m3e-type-body-small)
		line-height: 1.5

	@media (max-width: bp-sm - 1px)
		padding: 1rem 0.75rem

		&__list
			padding-top: 1.25rem
</style>

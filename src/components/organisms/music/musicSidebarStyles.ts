export const musicSidebarStylus = `
.music-player
	min-width: 0
	display: flex
	flex-direction: column
	gap: 0.75rem
	color: var(--on-surface)

	&__track
		display: grid
		grid-template-columns: 3.25rem minmax(0, 1fr) auto
		align-items: center
		gap: 0.75rem
		min-width: 0

	&__cover
		width: 3.25rem
		height: 3.25rem
		display: grid
		place-items: center
		overflow: hidden
		border-radius: var(--shape-corner-full)
		background: var(--secondary-container)
		color: var(--on-secondary-container)
		transform: rotate(0)

		> svg
			width: 1.5rem
			height: 1.5rem

		img
			width: 100%
			height: 100%
			object-fit: cover
			border-radius: var(--shape-corner-full)

		&--playing
			animation: music-cover-playing var(--m3e-duration-ambient-extra-long) linear infinite

	&__metadata
		min-width: 0
		display: flex
		flex-direction: column
		gap: 0.125rem

		strong,
		span
			overflow: hidden
			text-overflow: ellipsis
			white-space: nowrap

		strong
			font: var(--m3e-type-title-small)

		span
			font: var(--m3e-type-body-small)
			color: var(--on-surface-variant)

	&__time,
	&__times,
	&__volume > span,
	&__playlist-item time
		font: var(--m3e-type-label-small)
		font-variant-numeric: tabular-nums
		color: var(--on-surface-variant)

		&__progress
			display: flex
			flex-direction: column
			gap: 0.125rem

		&__progress-control
			position: relative
			width: 100%
			min-height: 1.25rem
			display: flex
			align-items: center

			.m3-progress
				width: 100%
				max-width: none
				flex: 1 1 auto

			&--wavy
				overflow: visible

			input
				position: absolute
				inset: 0
				z-index: 1
				width: 100%
				height: 100%
				margin: 0
				opacity: 0
				cursor: pointer

				&:disabled
					cursor: default

				&:focus-visible
					outline: 2px solid var(--primary)
					outline-offset: 2px
					border-radius: var(--shape-corner-full)

		&__times
			display: flex
			justify-content: space-between

	&__controls
		display: grid
		grid-template-columns: 2rem 2.5rem 3.5rem 2.5rem 2rem
		justify-content: center
		align-items: center
		gap: 0.25rem

	&__volume
		display: grid
		grid-template-columns: 1.25rem minmax(0, 1fr) 2.5rem
		align-items: center
		gap: 0.5rem

		> svg
			width: 1.25rem
			height: 1.25rem
			color: var(--on-surface-variant)

	&__progress input,
	&__volume input
		appearance: none
		width: 100%
		height: 1.25rem
		margin: 0
		background: transparent
		cursor: pointer
		accent-color: var(--primary)

		&::-webkit-slider-runnable-track
			height: 0.25rem
			border-radius: var(--shape-corner-full)
			background: var(--surface-container-highest)

		&::-webkit-slider-thumb
			appearance: none
			width: 1rem
			height: 1rem
			margin-top: -0.375rem
			border: none
			border-radius: var(--shape-corner-full)
			background: var(--primary)

		&::-moz-range-track
			height: 0.25rem
			border-radius: var(--shape-corner-full)
			background: var(--surface-container-highest)

		&::-moz-range-thumb
			width: 1rem
			height: 1rem
			border: none
			border-radius: var(--shape-corner-full)
			background: var(--primary)

		&:focus-visible
			outline: 2px solid var(--primary)
			outline-offset: 2px

		&:disabled
			cursor: default
			opacity: 0.38

	&__playlist-toggle
		width: 100%
		height: 2.25rem
		display: grid
		grid-template-columns: 1.25rem 1fr 1.25rem
		align-items: center
		gap: 0.5rem
		padding: 0 0.5rem
		border: none
		border-radius: var(--shape-corner-s)
		background: transparent
		color: var(--on-surface-variant)
		font: var(--m3e-type-label-large)
		text-align: left
		cursor: pointer
		--m3e-state-color: var(--on-surface)

		> svg
			width: 1.25rem
			height: 1.25rem

	&__playlist-panel
		overflow: hidden

	&__playlist
		list-style: none
		max-height: 12rem
		display: flex
		flex-direction: column
		gap: 0.125rem
		margin: 0
		padding: 0.25rem 0 0
		overflow-y: auto
		overscroll-behavior: contain
		scrollbar-width: thin

	&__playlist-item
		width: 100%
		min-height: 2.75rem
		display: grid
		grid-template-columns: 1.5rem minmax(0, 1fr) auto
		align-items: center
		gap: 0.5rem
		padding: 0.375rem 0.5rem
		border: none
		border-radius: var(--shape-corner-s)
		background: transparent
		color: var(--on-surface)
		text-align: left
		cursor: pointer
		--m3e-state-color: var(--on-surface)

		&--current
			background: var(--secondary-container)
			color: var(--on-secondary-container)
			--m3e-state-color: var(--on-secondary-container)

	&__playlist-index
		display: grid
		place-items: center
		font: var(--m3e-type-label-medium)
		font-variant-numeric: tabular-nums
		text-align: center

		> svg
			width: 1.125rem
			height: 1.125rem

	&__playlist-copy
		min-width: 0
		display: flex
		flex-direction: column

		strong,
		span
			overflow: hidden
			text-overflow: ellipsis
			white-space: nowrap

		strong
			font: var(--m3e-type-body-medium)

		span
			font: var(--m3e-type-body-small)
			opacity: 0.75

	&__empty,
	&__error
		margin: 0
		padding: 0.75rem
		border-radius: var(--shape-corner-s)
		font: var(--m3e-type-body-medium)

	&__empty
		background: var(--surface-container)
		color: var(--on-surface-variant)
		text-align: center

	&__error
		background: var(--error-container)
		color: var(--on-error-container)

@keyframes music-cover-playing
	to
		transform: rotate(360deg)

html.motion-reduced .music-player__cover--playing
	animation: none

@media (prefers-reduced-motion: reduce)
	.music-player__cover--playing
		animation: none
`;

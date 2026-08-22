export const musicSidebarStylus = `
.music-player
	min-width: 0
	display: flex
	flex-direction: column
	gap: 0.75rem
	color: var(--on-surface)

	&__track
		display: grid
		grid-template-columns: 3.5rem minmax(0, 1fr)
		align-items: center
		gap: 0.75rem
		min-width: 0

	&__cover
		width: 3.5rem
		height: 3.5rem
		display: grid
		place-items: center
		overflow: hidden
		border-radius: var(--shape-corner-full)
		background: var(--secondary-container)
		color: var(--on-secondary-container)
		animation: music-cover-playing var(--m3e-duration-ambient-extra-long) linear infinite
		animation-play-state: paused

		> svg
			width: 1.5rem
			height: 1.5rem

		img
			width: 100%
			height: 100%
			object-fit: cover
			border-radius: var(--shape-corner-full)

		&--playing
			animation-play-state: running

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

	&__submeta
		display: flex
		justify-content: space-between
		align-items: center
		margin-top: 0.125rem
		min-height: 1.25rem

	&__time-display
		display: inline-flex
		align-items: center
		gap: 0.25rem
		font: var(--m3e-type-label-small)
		font-variant-numeric: tabular-nums
		color: var(--on-surface-variant)

	&__time-separator
		opacity: 0.5

	&__volume-inline
		display: flex
		align-items: center
		gap: 0.25rem

		.m3-icon-button
			width: 1.25rem
			height: 1.25rem
			padding: 0
			color: var(--on-surface-variant)

			&:hover
				color: var(--primary)

			&__icon
				font-size: 1rem

	&__volume-slider-wrap
		position: relative
		width: 3.25rem
		height: 1.25rem
		display: flex
		align-items: center

	&__volume-slider
		appearance: none
		-webkit-appearance: none
		width: 100%
		height: 0.25rem
		margin: 0
		padding: 0
		border: none
		border-radius: var(--shape-corner-full)
		background: linear-gradient(to right, var(--primary) 0%, var(--primary) var(--vol-pct, 70%), var(--surface-container-highest) var(--vol-pct, 70%), var(--surface-container-highest) 100%)
		cursor: pointer
		outline: none

		&::-webkit-slider-runnable-track
			appearance: none
			-webkit-appearance: none
			height: 0.25rem
			border-radius: var(--shape-corner-full)
			background: transparent
			border: none

		&::-webkit-slider-thumb
			appearance: none
			-webkit-appearance: none
			width: 0.5rem
			height: 0.5rem
			margin-top: -0.125rem
			border: none
			border-radius: var(--shape-corner-full)
			background: var(--primary)
			box-shadow: 0 0 0 1px var(--surface-container-lowest)
			transition: transform var(--m3e-duration-short) var(--m3e-easing-standard)

			&:hover
				transform: scale(1.3)

		&::-moz-range-track
			height: 0.25rem
			border-radius: var(--shape-corner-full)
			background: transparent
			border: none

		&::-moz-range-progress
			height: 0.25rem
			border-radius: var(--shape-corner-full)
			background: var(--primary)

		&::-moz-range-thumb
			width: 0.5rem
			height: 0.5rem
			border: none
			border-radius: var(--shape-corner-full)
			background: var(--primary)
			box-shadow: 0 0 0 1px var(--surface-container-lowest)
			transition: transform var(--m3e-duration-short) var(--m3e-easing-standard)

			&:hover
				transform: scale(1.3)

		&:focus-visible
			outline: 2px solid var(--primary)
			outline-offset: 2px

		&:disabled
			cursor: default
			opacity: 0.38

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
		height: 1.25rem
		display: flex
		align-items: center
		touch-action: pan-y

		.m3-progress
			position: relative
			z-index: 0
			width: 100%
			max-width: none
			pointer-events: none

		.m3-progress--wavy
			height: 10px
			overflow: visible

			.m3-progress__wavy-track,
			.m3-progress__wavy-active,
			.m3-progress__wavy-wave
				width: 100%

		input
			appearance: none
			-webkit-appearance: none
			position: absolute
			inset: 0
			z-index: 2
			width: 100%
			height: 100%
			margin: 0
			padding: 0
			border: none
			background: transparent !important
			opacity: 0
			cursor: pointer
			accent-color: transparent

			&::-webkit-slider-runnable-track
				appearance: none
				-webkit-appearance: none
				background: transparent !important
				border: none
				height: 100%

			&::-webkit-slider-thumb
				appearance: none
				-webkit-appearance: none
				opacity: 0
				width: 1.25rem
				height: 1.25rem
				background: transparent !important
				border: none
				box-shadow: none

			&::-moz-range-track
				background: transparent !important
				border: none
				height: 100%

			&::-moz-range-thumb
				opacity: 0
				width: 1.25rem
				height: 1.25rem
				background: transparent !important
				border: none
				box-shadow: none

			&:disabled
				cursor: default

			&:focus-visible
				outline: 2px solid var(--primary)
				outline-offset: 2px
				border-radius: var(--shape-corner-s)

	&__controls
		display: flex
		justify-content: space-between
		align-items: center
		padding: 0 0.25rem

		.m3-icon-button
			color: var(--on-surface-variant)

			&:hover:not(:disabled)
				color: var(--primary)

			&--filled
				color: var(--on-primary)

				&:hover:not(:disabled)
					color: var(--on-primary)

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
		scrollbar-width: none

		&::-webkit-scrollbar
			display: none

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

html.motion-reduced .music-player__cover
	animation: none

@media (prefers-reduced-motion: reduce)
	.music-player__cover
		animation: none
`;

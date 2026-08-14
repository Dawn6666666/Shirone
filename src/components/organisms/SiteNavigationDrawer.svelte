<script lang="ts">
	/**
	 * 全站导航抽屉（M3 ModalNavigationDrawer 应用，自包含实现，不改原子）。
	 * 顶部栏菜单按钮派发 site-drawer:toggle 事件开合；内容：
	 *   一级导航（navBarConfig）+ 可折叠「分类」分组（多级扩展点）。
	 * 链接由 Swup 自动接管，点击后收起抽屉；高亮与当前路由/分类筛选同步。
	 */
	import Icon from "@iconify/svelte";
	import { LinkPresets } from "@/constants/link-presets";
	import { navBarConfig, siteConfig } from "@/config";
	import I18nKey from "@i18n/i18nKey";
	import { i18n } from "@i18n/translation";
	import { onMount, tick } from "svelte";
	import { url } from "@utils/url-utils";

	let {
		categories = [] as { name: string; count: number; url: string }[],
	}: {
		categories?: { name: string; count: number; url: string }[];
	} = $props();

	let open = $state(false);
	let activePrimary = $state("");
	let activeCategory = $state("");
	const openGroups = $state({ categories: true });

	const links = navBarConfig.links.map((item) =>
		typeof item === "number" ? LinkPresets[item] : item,
	);

	const ICONS: Record<string, string> = {
		home: "material-symbols:home",
		archive: "material-symbols:archive",
		about: "material-symbols:info",
		github: "fa6-brands:github",
	};

	const primaryItems = links.map((link) => {
		const key = link.name.toLowerCase();
		return {
			value: key,
			label: link.name,
			icon: ICONS[key] ?? "material-symbols:circle",
			href: link.external ? link.url : url(link.url),
			external: !!link.external,
		};
	});

	function syncFromRoute() {
		const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
		const categoryParam = new URLSearchParams(window.location.search).get("category");
		// 与桌面分类栏（CategoryBar）优先级一致：分类筛选 query 优先于归档页。
		// 位于 /archive/?category=... 时只高亮分类项，不再同时高亮一级「归档」，避免双重高亮。
		if (categoryParam) {
			activePrimary = "";
			activeCategory = categoryParam;
			return;
		}
		if (pathname === "/") activePrimary = "home";
		else if (pathname === "/archive") activePrimary = "archive";
		else if (pathname === "/about") activePrimary = "about";
		else activePrimary = "";
		activeCategory = "";
	}

	// 点击链接后收起抽屉；外部链接不改变路由，高亮已由路由同步维护
	function handleNavClick() {
		open = false;
	}

	function toggleGroup(group: "categories") {
		openGroups[group] = !openGroups[group];
	}

	onMount(() => {
		syncFromRoute();
		const onToggle = () => {
			open = !open;
			if (open) {
				tick().then(() => {
					drawerEl?.querySelector<HTMLElement>("a, button")?.focus();
				});
			}
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") open = false;
		};
		document.addEventListener("site-drawer:toggle", onToggle);
		document.addEventListener("swup:content:replace", syncFromRoute);
		window.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("site-drawer:toggle", onToggle);
			document.removeEventListener("swup:content:replace", syncFromRoute);
			window.removeEventListener("keydown", onKey);
		};
	});

	let drawerEl: HTMLElement | undefined = $state();
</script>

<div
	class="site-drawer"
	class:site-drawer--open={open}
>
	<div class="site-drawer__scrim" aria-hidden="true" onclick={() => (open = false)}></div>
	<aside
		bind:this={drawerEl}
		class="site-drawer__panel"
		role="dialog"
		aria-modal="true"
		aria-label={siteConfig.title}
	>
		<div class="site-drawer__brand">
			<div class="site-drawer__title">{siteConfig.title}</div>
			<div class="site-drawer__subtitle">{siteConfig.subtitle}</div>
		</div>

		<nav class="site-drawer__nav" aria-label="Navigation drawer">
			{#each primaryItems as item (item.value)}
				<a
					href={item.href}
					class="site-drawer__item"
					class:site-drawer__item--active={activePrimary === item.value}
					aria-current={activePrimary === item.value ? "page" : undefined}
					target={item.external ? "_blank" : undefined}
					rel={item.external ? "me" : undefined}
					onclick={handleNavClick}
				>
					<span class="site-drawer__item-icon" aria-hidden="true">
						<Icon icon={item.icon} />
					</span>
					<span class="site-drawer__item-label">{item.label}</span>
				</a>
			{/each}

			<!-- 分类分组 -->
			<div class="site-drawer__group">
				<button
					type="button"
					class="site-drawer__group-head"
					onclick={() => toggleGroup("categories")}
					aria-expanded={openGroups.categories}
				>
					<span class="site-drawer__group-icon" aria-hidden="true">
						<Icon icon="material-symbols:folder" />
					</span>
					<span class="site-drawer__group-label">{i18n(I18nKey.categories)}</span>
					<Icon
						class={openGroups.categories
							? "site-drawer__group-arrow site-drawer__group-arrow--open"
							: "site-drawer__group-arrow"}
						icon="material-symbols:keyboard-arrow-down"
					/>
				</button>
				{#if openGroups.categories}
					<div class="site-drawer__group-body">
						{#each categories as cat (cat.name)}
							<a
								href={cat.url}
								class="site-drawer__item site-drawer__item--child"
								class:site-drawer__item--active={activeCategory === cat.name}
								aria-current={activeCategory === cat.name ? "page" : undefined}
								onclick={handleNavClick}
							>
								<span class="site-drawer__item-label">{cat.name}</span>
								<span class="site-drawer__count" aria-hidden="true">{cat.count}</span>
							</a>
						{/each}
					</div>
				{/if}
			</div>

		</nav>
	</aside>
</div>

<style lang="stylus">
.site-drawer
	position: fixed
	inset: 0
	z-index: 60
	visibility: hidden
	pointer-events: none

	&--open
		visibility: visible
		pointer-events: auto

	&__scrim
		position: absolute
		inset: 0
		background: unquote("color-mix(in oklab, var(--scrim, #000) 32%, transparent)")
		opacity: 0
		transition: opacity var(--m3e-duration-medium) var(--m3e-easing-standard)

	&--open &__scrim
		opacity: 1

	/* 面板：360dp 宽、surface-container-low、右侧 16dp 大圆角，左侧滑入 */
	&__panel
		position: absolute
		top: 0
		bottom: 0
		left: 0
		display: flex
		flex-direction: column
		width: 360px
		max-width: 85vw
		box-sizing: border-box
		background: var(--surface-container-low)
		color: var(--on-surface)
		border-radius: 0 var(--shape-corner-l) var(--shape-corner-l) 0
		transform: translateX(-100%)
		transition: transform var(--m3e-duration-long) var(--m3e-easing-emphasized-decelerate)

	&--open &__panel
		transform: translateX(0)

	&__brand
		padding: 20px 28px 12px
		flex: none

	&__title
		font: var(--m3e-type-title-large)
		color: var(--on-surface)

	&__subtitle
		margin-top: 4px
		font: var(--m3e-type-body-medium)
		color: var(--on-surface-variant)

	&__nav
		flex: 1
		overflow-y: auto
		padding: 8px 12px 16px

	/* 一级/子项：全宽 56dp，选中整项 secondary-container 全圆 pill */
	&__item
		display: flex
		align-items: center
		gap: 12px
		width: 100%
		min-height: 56px
		box-sizing: border-box
		padding: 0 16px
		border-radius: var(--shape-corner-full)
		color: var(--on-surface-variant)
		text-decoration: none
		cursor: pointer
		transition:
			background-color var(--m3e-duration-short) var(--m3e-easing-standard),
			color var(--m3e-duration-short) var(--m3e-easing-standard)

		&:hover
			background: unquote("color-mix(in oklab, var(--on-surface) 8%, transparent)")

		&:focus-visible
			outline: 2px solid var(--secondary)
			outline-offset: -2px

		&--active
			background: var(--secondary-container)
			color: var(--on-secondary-container)
			&:hover
				background: var(--secondary-container)

		&--child
			min-height: 48px
			padding-left: 32px

	&__item-icon
		display: flex
		flex: none
		color: var(--on-surface-variant)
		> :global(svg)
			width: 1.5rem
			height: 1.5rem

	&__item--active &__item-icon
		color: var(--on-secondary-container)

	&__item-label
		flex: 1
		min-width: 0
		font: var(--m3e-type-label-large)
		white-space: nowrap
		overflow: hidden
		text-overflow: ellipsis

	&__item--child &__item-label
		font: var(--m3e-type-body-medium)

	&__count
		flex: none
		min-width: 20px
		text-align: center
		font-size: 0.75rem
		font-weight: 600
		padding: 2px 8px
		border-radius: var(--shape-corner-full)
		background: var(--surface-container-high)
		color: var(--on-surface-variant)

	/* 分组头部 */
	&__group
		margin-top: 4px

	&__group-head
		display: flex
		align-items: center
		gap: 12px
		width: 100%
		min-height: 56px
		box-sizing: border-box
		padding: 0 16px
		border: none
		border-radius: var(--shape-corner-full)
		background: none
		color: var(--on-surface-variant)
		cursor: pointer
		transition: background-color var(--m3e-duration-short) var(--m3e-easing-standard)
		&:hover
			background: unquote("color-mix(in oklab, var(--on-surface) 8%, transparent)")
		&:focus-visible
			outline: 2px solid var(--secondary)
			outline-offset: -2px

	&__group-icon
		display: flex
		flex: none
		> :global(svg)
			width: 1.5rem
			height: 1.5rem

	&__group-label
		flex: 1
		text-align: left
		font: var(--m3e-type-label-large)
		color: var(--on-surface-variant)

	&__group-arrow
		display: flex
		flex: none
		transition: transform var(--m3e-duration-short) var(--m3e-easing-standard)
		> :global(svg)
			width: 1.25rem
			height: 1.25rem

		&--open
			transform: rotate(180deg)

	&__group-body
		padding: 4px 0 8px
</style>

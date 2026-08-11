<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import Icon from "@iconify/svelte";
import { url } from "@utils/url-utils.ts";
import { onMount } from "svelte";
import type { SearchResult } from "@/global";

let keywordDesktop = "";
let keywordMobile = "";
let result: SearchResult[] = [];
let isSearching = false;
let pagefindLoaded = false;
let initialized = false;
let isDesktopSearchExpanded = false;
let windowJustFocused = false;
let focusTimer: ReturnType<typeof setTimeout>;
let blurTimer: ReturnType<typeof setTimeout>;

const fakeResult: SearchResult[] = [
	{
		url: url("/"),
		meta: {
			title: "This Is a Fake Search Result",
		},
		excerpt:
			"Because the search cannot work in the <mark>dev</mark> environment.",
	},
	{
		url: url("/"),
		meta: {
			title: "If You Want to Test the Search",
		},
		excerpt: "Try running <mark>npm build && npm preview</mark> instead.",
	},
];

const togglePanel = () => {
	const panel = document.getElementById("search-panel");
	panel?.classList.toggle("float-panel-closed");
};

const setPanelVisibility = (show: boolean, isDesktop: boolean): void => {
	const panel = document.getElementById("search-panel");
	if (!panel || !isDesktop) return;

	if (show) {
		panel.classList.remove("float-panel-closed");
	} else {
		panel.classList.add("float-panel-closed");
	}
};

// 展开桌面搜索：hover 受窗口焦点保护（防止切窗口误触），显式点击/触碰不受限
const expandDesktopSearch = (force = false) => {
	if (!force && windowJustFocused) {
		return;
	}
	isDesktopSearchExpanded = true;
	setTimeout(() => {
		const input = document.getElementById(
			"search-input-desktop",
		) as HTMLInputElement;
		input?.focus();
	}, 0);
};

const collapseDesktopSearch = () => {
	if (!keywordDesktop) {
		isDesktopSearchExpanded = false;
	}
};

// 失焦后延迟折叠，允许搜索结果点击先执行
const handleBlur = () => {
	blurTimer = setTimeout(() => {
		isDesktopSearchExpanded = false;
		setPanelVisibility(false, true);
	}, 200);
};

const search = async (keyword: string, isDesktop: boolean): Promise<void> => {
	if (!keyword) {
		setPanelVisibility(false, isDesktop);
		result = [];
		return;
	}

	if (!initialized) {
		return;
	}

	isSearching = true;

	try {
		let searchResults: SearchResult[] = [];

		if (import.meta.env.PROD && pagefindLoaded && window.pagefind) {
			const response = await window.pagefind.search(keyword);
			searchResults = await Promise.all(
				response.results.map((item) => item.data()),
			);
		} else if (import.meta.env.DEV) {
			searchResults = fakeResult;
		} else {
			searchResults = [];
			console.error("Pagefind is not available in production environment.");
		}

		result = searchResults;
		setPanelVisibility(result.length > 0, isDesktop);
	} catch (error) {
		console.error("Search error:", error);
		result = [];
		setPanelVisibility(false, isDesktop);
	} finally {
		isSearching = false;
	}
};

onMount(() => {
	const initializeSearch = () => {
		initialized = true;
		pagefindLoaded =
			typeof window !== "undefined" &&
			!!window.pagefind &&
			typeof window.pagefind.search === "function";
		console.log("Pagefind status on init:", pagefindLoaded);
		if (keywordDesktop) search(keywordDesktop, true);
		if (keywordMobile) search(keywordMobile, false);
	};

	if (import.meta.env.DEV) {
		console.log(
			"Pagefind is not available in development mode. Using mock data.",
		);
		initializeSearch();
	} else {
		document.addEventListener("pagefindready", () => {
			console.log("Pagefind ready event received.");
			initializeSearch();
		});
		document.addEventListener("pagefindloaderror", () => {
			console.warn(
				"Pagefind load error event received. Search functionality will be limited.",
			);
			initializeSearch();
		});

		// Fallback in case events are not caught or pagefind is already loaded by the time this script runs
		setTimeout(() => {
			if (!initialized) {
				console.log("Fallback: Initializing search after timeout.");
				initializeSearch();
			}
		}, 2000);
	}

	// 监听窗口焦点，防止切换窗口时自动展开搜索框
	const handleWindowFocus = () => {
		windowJustFocused = true;
		clearTimeout(focusTimer);
		focusTimer = setTimeout(() => {
			windowJustFocused = false;
		}, 500);
	};
	window.addEventListener("focus", handleWindowFocus);

	return () => window.removeEventListener("focus", handleWindowFocus);
});

$: if (initialized && keywordDesktop) {
	(async () => {
		await search(keywordDesktop, true);
	})();
}

$: if (initialized && keywordMobile) {
	(async () => {
		await search(keywordMobile, false);
	})();
}
</script>

<!-- 桌面搜索：独立按钮（40px 图标按钮），hover/点击展开成胶囊搜索条 -->
<div class="hidden lg:block relative w-10 h-10 shrink-0">
    <div
        id="search-bar"
        class="m3-state-layer absolute right-0 top-0 flex items-center overflow-hidden rounded-full transition-all duration-300 h-10
               {isDesktopSearchExpanded
                   ? 'w-48 bg-(--surface-container-high)'
                   : 'w-10 bg-transparent'}"
        onmouseenter={() => { if (!isDesktopSearchExpanded) expandDesktopSearch(); }}
        onmouseleave={collapseDesktopSearch}
        onclick={() => {
            // 触碰/点击显式展开（force 忽略窗口焦点保护），再聚焦输入
            if (!isDesktopSearchExpanded) expandDesktopSearch(true);
            const input = document.getElementById("search-input-desktop") as HTMLInputElement;
            input?.focus();
        }}
    >
        <Icon icon="material-symbols:search"
              class="pointer-events-none shrink-0 text-[1.25rem] text-[var(--on-surface-variant)] transition-all
                     {isDesktopSearchExpanded ? 'ml-3' : 'mx-auto'}"></Icon>
        <input
            id="search-input-desktop"
            name="search-desktop"
            placeholder={i18n(I18nKey.search)}
            bind:value={keywordDesktop}
            tabindex={isDesktopSearchExpanded ? 0 : -1}
            onfocus={() => { clearTimeout(blurTimer); search(keywordDesktop, true); }}
            onblur={handleBlur}
            class="h-full bg-transparent outline-0 text-(--on-surface) caret-(--primary) transition-all
                   {isDesktopSearchExpanded ? 'w-32 pl-2 opacity-100' : 'w-0 opacity-0'}"
        />
    </div>
</div>

<!-- toggle btn for phone/tablet view -->
<button onclick={togglePanel} aria-label="Search Panel" id="search-switch"
        class="btn-plain scale-animation lg:!hidden rounded-lg w-11 h-11 active:scale-90">
    <Icon icon="material-symbols:search" class="text-[1.25rem]"></Icon>
</button>

<!-- search panel -->
<div id="search-panel" class="float-panel float-panel-closed search-panel absolute md:w-[30rem]
top-20 left-4 md:left-[unset] right-4 shadow-2xl rounded-2xl p-2">

    <!-- 面板内搜索条（移动端）：M3 胶囊填充式 -->
    <div class="m3-state-layer flex relative lg:hidden items-center h-11 rounded-full overflow-hidden bg-(--surface-container-high)">
        <Icon icon="material-symbols:search" class="ml-3 text-[1.25rem] text-[var(--on-surface-variant)]"></Icon>
        <input name="search-mobile" placeholder={i18n(I18nKey.search)} bind:value={keywordMobile}
               class="pl-2 pr-4 h-full min-w-0 flex-1 bg-transparent outline-0 text-sm text-(--on-surface) caret-(--primary)" />
    </div>

    <!-- search results -->
    {#each result as item}
        <a href={item.url}
           class="transition first-of-type:mt-2 lg:first-of-type:mt-0 group block
       rounded-xl text-lg px-3 py-2 hover:bg-[var(--btn-plain-bg-hover)] active:bg-[var(--btn-plain-bg-active)]">
            <div class="transition text-[var(--on-surface)] inline-flex font-bold group-hover:text-[var(--primary)]">
                {item.meta.title}<Icon icon="fa6-solid:chevron-right" class="transition text-[0.75rem] translate-x-1 my-auto text-[var(--primary)]"></Icon>
            </div>
            <div class="transition text-sm text-[var(--on-surface-variant)]">
                {@html item.excerpt}
            </div>
        </a>
    {/each}
</div>

<style>
  .search-panel {
    max-height: calc(100vh - 100px);
    overflow-y: auto;
  }
</style>

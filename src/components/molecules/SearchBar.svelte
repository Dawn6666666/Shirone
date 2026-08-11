<script lang="ts">
/**
 * M3E SearchBar — 导航栏折叠式胶囊搜索条分子。
 * 折叠时为 40px 图标按钮，hover（受窗口焦点保护，防切窗误触）或点击展开为
 * w-48 胶囊输入条，失焦延迟自动折叠。value / expanded 可双向绑定，
 * 展开折叠交互细节全部内聚在此，Search 有机体只负责搜索与结果面板。
 */
import Icon from "@iconify/svelte";
import { onMount } from "svelte";

let {
	value = $bindable(""),
	expanded = $bindable(false),
	id = "search-input",
	name = "search",
	placeholder = "",
	onfocus = () => {},
	oncollapse = () => {},
}: {
	value?: string;
	expanded?: boolean;
	id?: string;
	name?: string;
	placeholder?: string;
	onfocus?: () => void;
	oncollapse?: () => void;
} = $props();

let windowJustFocused = false;
let focusTimer: ReturnType<typeof setTimeout>;
let blurTimer: ReturnType<typeof setTimeout>;

// hover 展开受窗口焦点保护：切换窗口后 500ms 内不响应，防止误触
const expand = (force = false): void => {
	if (!force && windowJustFocused) return;
	expanded = true;
	setTimeout(() => {
		const input = document.getElementById(id) as HTMLInputElement;
		input?.focus();
	}, 0);
};

// 输入有关键字时不折叠（继续编辑 / 点击结果）
const collapse = (): void => {
	if (!value) {
		expanded = false;
	}
};

// 失焦后延迟折叠，允许搜索结果点击先执行
const handleBlur = (): void => {
	blurTimer = setTimeout(() => {
		expanded = false;
		oncollapse();
	}, 200);
};

const handleFocus = (): void => {
	clearTimeout(blurTimer);
	onfocus();
};

onMount(() => {
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
</script>

<div class="hidden lg:block relative w-10 h-10 shrink-0">
    <div
        class="m3-state-layer absolute right-0 top-0 flex items-center overflow-hidden rounded-full transition-all duration-300 h-10
               {expanded ? 'w-48 bg-(--surface-container-high)' : 'w-10 bg-transparent'}"
        onmouseenter={() => {
            if (!expanded) expand();
        }}
        onmouseleave={collapse}
        onclick={() => {
            // 触碰/点击显式展开（force 忽略窗口焦点保护），再聚焦输入
            if (!expanded) expand(true);
        }}
    >
        <Icon
            icon="material-symbols:search"
            class="pointer-events-none shrink-0 text-[1.25rem] transition-all
                   {expanded
                       ? 'ml-3 text-[var(--on-surface-variant)]'
                       : 'mx-auto text-[var(--on-surface)]'}"
        ></Icon>
        <input
            {id}
            {name}
            {placeholder}
            bind:value
            tabindex={expanded ? 0 : -1}
            onfocus={handleFocus}
            onblur={handleBlur}
            class="h-full bg-transparent outline-0 text-(--on-surface) caret-(--primary) transition-all
                   {expanded ? 'w-32 pl-2 opacity-100' : 'w-0 opacity-0'}"
        />
    </div>
</div>

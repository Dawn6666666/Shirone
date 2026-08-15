/**
 * 瀑布流打包（grid row-span 实现，无绝对定位）：
 * 卡片保持文档流与语义，仅由 JS 赋 `grid-column-start`（最短列分配，
 * 顺序接近行主序）与 `grid-row-end: span N`（N = 卡片高度换算的行数）。
 * 列数仍由 CSS `repeat(auto-fill, minmax(--post-card-min, 1fr))` 决定，
 * 本模块只做分配——容器换列数（resize）后重新 pack 即可。
 *
 * 配套约定（PostPage 样式，两处需同步改）：
 * - grid 模式 `grid-auto-rows: 8px`、`row-gap: 0`（行距烘焙进 span）；
 * - 行距 = ROW_GAP px（与 column-gap 同值，均对应 --m3e-space-4）。
 */

const ROW_UNIT = 8; // px，对应 PostPage grid-auto-rows
const ROW_GAP = 16; // px，烘焙进 span 的视觉行距（--m3e-space-4）

/** 最短列打包：给每张卡片设置列定位与行跨度；单列时清空内联定位 */
export function packMasonry(container: HTMLElement): void {
	const cards = Array.from(container.children) as HTMLElement[];
	if (cards.length === 0) return;

	const colCount = getComputedStyle(container)
		.gridTemplateColumns.split(" ")
		.filter(Boolean).length;

	if (colCount <= 1) {
		for (const card of cards) {
			card.style.gridColumnStart = "";
			card.style.gridRowEnd = "";
		}
		return;
	}

	const columnHeights = new Array<number>(colCount).fill(0);
	for (const card of cards) {
		const height = card.offsetHeight; // align-items:start → 自然高度
		let shortest = 0;
		for (let col = 1; col < colCount; col++) {
			if (columnHeights[col] < columnHeights[shortest]) shortest = col;
		}
		card.style.gridColumnStart = String(shortest + 1);
		card.style.gridRowEnd = `span ${Math.ceil((height + ROW_GAP) / ROW_UNIT)}`;
		columnHeights[shortest] += height + ROW_GAP;
	}
}

/**
 * 挂接瀑布流生命周期：立即 pack + 容器宽度变化（换列数）时重排。
 * swup 内容替换后容器是新元素，需对新区块重新调用。
 */
export function setupMasonry(container: HTMLElement): void {
	packMasonry(container);
	if (typeof ResizeObserver === "undefined") return;
	const observer = new ResizeObserver(() => packMasonry(container));
	observer.observe(container);
}

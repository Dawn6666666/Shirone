/**
 * 最小动效补丁插件（M3E）。
 * - prefersReducedMotion()：统一「系统偏好 / 站点手动开关」的动效降级检测；
 * - collapse：Svelte action，高度 0↔auto 的展开/折叠动画，
 *   WAAPI 驱动（可取消、无逐帧 rAF 开销），reduced-motion 时直接到位。
 */

/** 是否应降级动效：系统 prefers-reduced-motion 或站点手动开关（html.motion-reduced） */
export function prefersReducedMotion(): boolean {
	if (typeof window === "undefined") return false;
	return (
		window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ||
		document.documentElement.classList.contains("motion-reduced")
	);
}

export interface CollapseParams {
	/** 目标状态：true 展开 / false 收起 */
	open: boolean;
	/** 动画时长 ms（默认 240，M3 emphasized） */
	duration?: number;
}

const COLLAPSE_EASING = "cubic-bezier(0.2, 0, 0, 1)"; // M3 emphasized-decelerate

/**
 * 声明式展开/折叠插件：
 *   <div use:collapse={{ open: expanded }}>...</div>
 * 内容高度在 0 ↔ auto 间过渡；reduced-motion 时跳过动画直接切换。
 */
export function collapse(node: HTMLElement, params: CollapseParams) {
	let anim: Animation | null = null;
	let current = params.open;

	node.style.overflow = "hidden";
	node.style.height = current ? "auto" : "0px";

	function settle(open: boolean) {
		node.style.height = open ? "auto" : "0px";
	}

	function play(open: boolean) {
		anim?.cancel();
		if (prefersReducedMotion()) {
			settle(open);
			return;
		}
		const from = open ? 0 : node.scrollHeight;
		const to = open ? node.scrollHeight : 0;
		if (from === to) {
			settle(open);
			return;
		}
		node.style.height = `${from}px`;
		anim = node.animate(
			[{ height: `${from}px` }, { height: `${to}px` }],
			{
				duration: params.duration ?? 240,
				easing: COLLAPSE_EASING,
			},
		);
		anim.onfinish = () => settle(open);
		anim.oncancel = () => settle(current);
	}

	return {
		update(next: CollapseParams) {
			params = next;
			if (next.open === current) return;
			current = next.open;
			play(current);
		},
		destroy() {
			anim?.cancel();
			node.style.height = "";
			node.style.overflow = "";
		},
	};
}

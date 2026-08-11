/**
 * M3E Snackbar 事件总线。
 * Snackbar.svelte 监听该事件；任何环境（含纯 JS 的 markdown 复制按钮）
 * 通过 showSnackbar() 触发，无需组件间直接耦合。
 */
export const SNACKBAR_EVENT = "m3e:snackbar";

export function showSnackbar(message: string): void {
	if (typeof window === "undefined") return;
	window.dispatchEvent(
		new CustomEvent(SNACKBAR_EVENT, { detail: { message } }),
	);
}

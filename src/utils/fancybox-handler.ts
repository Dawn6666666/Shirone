/**
 * Fancybox 处理器
 * 管理图片灯箱的按需加载和生命周期
 */

import {
	FANCYBOX_SELECTORS,
	type FancyboxConfig,
	getDefaultFancyboxConfig,
} from "./fancybox-config";

// Fancybox 模块类型
// biome-ignore lint/suspicious/noExplicitAny: Fancybox 模块动态加载，无精确类型
type FancyboxModule = any;

/**
 * Fancybox 处理器类
 * 负责图片灯箱的按需加载和绑定管理
 */
export class FancyboxHandler {
	private Fancybox: FancyboxModule | null = null;
	private boundSelectors: string[] = [];
	private initialized = false;
	private initPromise: Promise<void> | null = null;

	/**
	 * 初始化 Fancybox
	 * 按需加载 Fancybox 模块和样式；
	 * 并发调用（如 client:only 岛挂载晚于全局 init）合并为一次，防止双绑
	 */
	async init(): Promise<void> {
		if (!this.checkForImages()) {
			return;
		}

		this.initPromise ??= this.doInit();
		await this.initPromise;
	}

	private async doInit(): Promise<void> {
		if (!this.Fancybox) {
			await this.loadFancybox();
		}

		// 避免重复绑定
		if (this.boundSelectors.length > 0) {
			return;
		}

		this.bindSelectors();
		this.initialized = true;
	}

	/**
	 * 检查页面是否有需要灯箱的图片
	 */
	private checkForImages(): boolean {
		return (
			document.querySelector(FANCYBOX_SELECTORS.articleImages) !== null ||
			document.querySelector(FANCYBOX_SELECTORS.singleFancybox) !== null
		);
	}

	/**
	 * 按需加载 Fancybox 模块和样式
	 */
	private async loadFancybox(): Promise<void> {
		const mod = await import("@fancyapps/ui");
		this.Fancybox = mod.Fancybox;
		await import("@fancyapps/ui/dist/fancybox/fancybox.css");
		await import("../styles/fancybox-custom.css");
	}

	/**
	 * 绑定图片选择器
	 */
	private bindSelectors(): void {
		if (!this.Fancybox) {
			return;
		}

		const commonConfig = getDefaultFancyboxConfig();

		// 文章正文图片和封面
		this.Fancybox.bind(
			FANCYBOX_SELECTORS.articleImages,
			this.createArticleConfig(commonConfig),
		);
		this.boundSelectors.push(FANCYBOX_SELECTORS.articleImages);

		// 带 data-fancybox 属性的单独元素
		this.Fancybox.bind(FANCYBOX_SELECTORS.singleFancybox, commonConfig);
		this.boundSelectors.push(FANCYBOX_SELECTORS.singleFancybox);
	}

	/**
	 * 创建文章图片的灯箱配置
	 * 整篇文章的图片作为一个轮播组
	 */
	private createArticleConfig(commonConfig: FancyboxConfig): FancyboxConfig {
		const carouselConfig = commonConfig.Carousel ?? {};
		const lazyloadConfig = (carouselConfig as { Lazyload?: unknown }).Lazyload;

		return {
			...commonConfig,
			groupAll: true,
			Carousel: {
				...carouselConfig,
				transition: "slide",
				Lazyload: {
					...(typeof lazyloadConfig === "object" ? lazyloadConfig : {}),
					preload: 2,
				},
			},
		};
	}

	/**
	 * 清理 Fancybox 绑定
	 * 在页面切换前调用
	 */
	cleanup(): void {
		if (!this.Fancybox) {
			return;
		}

		for (const selector of this.boundSelectors) {
			this.Fancybox.unbind(selector);
		}
		this.boundSelectors = [];
		// 解绑后允许下次 init 重新绑定
		this.initPromise = null;
	}

	/**
	 * 完全销毁 Fancybox
	 */
	destroy(): void {
		this.cleanup();
		this.Fancybox = null;
		this.initialized = false;
		this.initPromise = null;
	}

	/**
	 * 获取初始化状态
	 */
	isInitialized(): boolean {
		return this.initialized;
	}
}

// 全局单例
let globalFancyboxHandler: FancyboxHandler | null = null;

/**
 * 获取全局 Fancybox 处理器实例
 */
export function getFancyboxHandler(): FancyboxHandler {
	if (!globalFancyboxHandler) {
		globalFancyboxHandler = new FancyboxHandler();
	}
	return globalFancyboxHandler;
}

/**
 * 初始化 Fancybox（便捷函数）
 */
export async function initFancybox(): Promise<void> {
	const handler = getFancyboxHandler();
	await handler.init();
}

/**
 * 清理 Fancybox（便捷函数）
 */
export function cleanupFancybox(): void {
	if (globalFancyboxHandler) {
		globalFancyboxHandler.cleanup();
	}
}

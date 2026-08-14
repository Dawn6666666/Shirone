import { sidebarConfig } from "@/config/sidebarConfig";

export interface ResponsiveSidebarConfig {
	position: "left" | "right";
	hasComponents: boolean;
	hasTopComponents: boolean;
	hasStickyComponents: boolean;
}

/**
 * 解析侧栏配置：过滤 enable 的组件，判断 top/sticky 分组是否存在。
 * 响应式断点沿用站点现有约定（lg = 1024px，与旧硬编码一致）：
 * - 1024px 以下：单列（grid-cols-1），侧栏与内容上下堆叠；
 * - 1024px 以上：两列（侧栏 17.5rem + 内容）。
 */
export function getResponsiveSidebarConfig(): ResponsiveSidebarConfig {
	const components = sidebarConfig.enable
		? sidebarConfig.components.filter((c) => c.enable)
		: [];
	return {
		position: sidebarConfig.position,
		hasComponents: components.length > 0,
		hasTopComponents: components.some((c) => c.position === "top"),
		hasStickyComponents: components.some((c) => c.position === "sticky"),
	};
}

/**
 * 生成主网格列类。
 * left  → 内容在右侧：lg:grid-cols-[17.5rem_1fr]
 * right → 内容在左侧：lg:grid-cols-[1fr_17.5rem]
 * 1024px 以下统一单列 grid-cols-1。
 */
export function generateGridClasses(config: ResponsiveSidebarConfig): string {
	if (!config.hasComponents) {
		return "grid-cols-1";
	}
	return config.position === "left"
		? "grid-cols-1 lg:grid-cols-[17.5rem_1fr]"
		: "grid-cols-1 lg:grid-cols-[1fr_17.5rem]";
}

/**
 * 侧栏容器类：1024px 以下侧栏位于内容之后（第二行，还原 Fuwari 原版顺序），
 * 1024px 以上定位到对应列。left → 第 1 列；right → 第 2 列。
 */
export function generateSidebarClasses(
	config: ResponsiveSidebarConfig,
): string {
	const base = [
		"mb-4",
		"row-start-2",
		"row-end-3",
		"col-span-2",
		"lg:row-start-1",
		"lg:row-end-2",
		"lg:col-span-1",
		"lg:max-w-[17.5rem]",
		"onload-animation",
	];
	if (config.position === "left") {
		base.push("lg:col-start-1");
	} else {
		base.push("lg:col-start-2");
	}
	return base.join(" ");
}

/**
 * 主内容区类：1024px 以下全宽（第一行，内容在前），1024px 以上定位到内容列。
 * left → 第 2 列；right → 第 1 列。
 */
export function generateMainContentClasses(
	config: ResponsiveSidebarConfig,
): string {
	const base = [
		"transition-swup-fade",
		"col-span-2",
		"lg:col-span-1",
		"overflow-hidden",
		"min-w-0",
	];
	if (config.position === "left") {
		base.push("lg:col-start-2");
	} else {
		base.push("lg:col-start-1");
	}
	return base.join(" ");
}

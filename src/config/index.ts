/**
 * 配置统一出口（barrel）：消费方一律 `import { xxx } from "@/config"`。
 *
 * 约定（详见本目录 README.md）：
 * - 值放在 `src/config/<domain>Config.ts`，类型放在 `src/types/<domain>Config.ts`；
 * - 存在反向依赖的模块（如 i18n/translation.ts 依赖 siteConfig）只允许从
 *   具体文件导入（`@/config/siteConfig`），禁止走本 barrel，避免循环依赖。
 */
export { siteConfig, getDefaultSpec, getDefaultStyle } from "./siteConfig";
export { profileConfig } from "./profileConfig";
export { licenseConfig } from "./licenseConfig";
export { expressiveCodeConfig } from "./expressiveCodeConfig";
export { LinkPresets, navBarConfig } from "./navBarConfig";
export { sidebarConfig } from "./sidebarConfig";
export { announcementConfig } from "./announcementConfig";
export { postListConfig, POST_CARD_MIN_WIDTH } from "./postListConfig";
export {
	articleConfig,
	resolveLastUpdatedNoticeOptions,
} from "./articleConfig";

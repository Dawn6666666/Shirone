/**
 * 番剧数据接入层：数据源分发 + 状态呈现元数据。
 *
 * 页面只依赖 getAnimeList(): AnimeItem[] —— 数据源差异被收敛在这里：
 * - local：src/data/anime.ts 手写数组（当前）；
 * - json：预留分支。外部收藏服务（Bangumi/Bilibili 等）由拉取脚本生成
 *   同构 JSON 写入 src/data/<filename>，此处构建期读文件并归一化
 *   （宽容字段 + 默认值，模式与本地数据完全一致），页面与组件零改动。
 */
import I18nKey from "@i18n/i18nKey";
import { animeData, type AnimeItem, type AnimeStatus } from "../data/anime";

/** 状态呈现元数据：筛选 chip 的 i18n 键 / 前置图标 / M3E 语义色（tonal pill 用） */
export const ANIME_STATUS_META: Record<
	AnimeStatus,
	{ key: I18nKey; icon: string; color: string }
> = {
	watching: {
		key: I18nKey.animeStatusWatching,
		icon: "material-symbols:play-arrow-rounded",
		color: "var(--primary)",
	},
	completed: {
		key: I18nKey.animeStatusCompleted,
		icon: "material-symbols:check-rounded",
		color: "var(--tertiary)",
	},
	planned: {
		key: I18nKey.animeStatusPlanned,
		icon: "material-symbols:bookmark-outline-rounded",
		color: "var(--secondary)",
	},
	onHold: {
		key: I18nKey.animeStatusOnHold,
		icon: "material-symbols:pause-rounded",
		color: "var(--on-surface-variant)",
	},
	dropped: {
		key: I18nKey.animeStatusDropped,
		icon: "material-symbols:close-rounded",
		color: "var(--error)",
	},
};

/** 数据源配置：本期 local；切 json 时由拉取脚本产出 src/data/<filename> */
export type AnimeSource = { type: "local" } | { type: "json"; filename: string };

const animeSource: AnimeSource = { type: "local" };

export function getAnimeList(): AnimeItem[] {
	switch (animeSource.type) {
		case "local":
			return animeData;
		case "json":
			// 预留：node:fs 读 src/data/<filename>，宽容解析为 AnimeItem[]（缺省字段回退）
			throw new Error(
				`Anime json source "${animeSource.filename}" is reserved but not implemented yet`,
			);
	}
}

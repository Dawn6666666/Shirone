/**
 * 站点统计取数（SideBar stats widget 消费）。
 * 模块级备忘化：构建期多个页面渲染共享一次汇总（总字数需要对全部
 * 文章跑 render 提取 remark 字数，不做缓存会逐页重复开销）。
 */
import { render } from "astro:content";
import { getCategoryList, getSortedMoments, getSortedPosts, getTagList } from "./content-utils";

export interface SiteStats {
	posts: number;
	moments: number;
	categories: number;
	tags: number;
	/** 全部文章 remark 字数之和 */
	words: number;
	/** 运行天数：以最早一篇文章的发布日为起点（无文章则 0） */
	days: number;
}

const DAY_MS = 86_400_000;

let cache: SiteStats | null = null;

export async function getSiteStats(): Promise<SiteStats> {
	if (cache) return cache;

	const [posts, moments, categories, tags] = await Promise.all([
		getSortedPosts(),
		getSortedMoments(),
		getCategoryList(),
		getTagList(),
	]);

	// 总字数与最早发布日来自同一批文章，一次遍历
	let words = 0;
	let earliest = Number.POSITIVE_INFINITY;
	for (const post of posts) {
		const { remarkPluginFrontmatter } = await render(post);
		words += remarkPluginFrontmatter.words ?? 0;
		const t = new Date(post.data.published).getTime();
		if (t < earliest) earliest = t;
	}

	cache = {
		posts: posts.length,
		moments: moments.length,
		categories: categories.length,
		tags: tags.length,
		words,
		days: Number.isFinite(earliest)
			? Math.max(0, Math.floor((Date.now() - earliest) / DAY_MS))
			: 0,
	};
	return cache;
}

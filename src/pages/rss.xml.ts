import rss from "@astrojs/rss";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { getSortedPosts } from "@utils/content-utils";
import { isEncryptedPost } from "@utils/post-encryption";
import { url } from "@utils/url-utils";
import type { APIContext } from "astro";
import MarkdownIt from "markdown-it";
import sanitizeHtml from "sanitize-html";
import { siteConfig } from "@/config";

const parser = new MarkdownIt();

/**
 * 清洗 MDX 特有语法，提取适合 RSS 阅读器呈现的 Markdown/HTML 文本
 */
function sanitizeMdxForFeed(raw: string): string {
	return (
		raw
			// 移除 import 语句
			.replace(/^import\s+[\s\S]*?['"][^'"]*['"];?\s*$/gm, "")
			// 移除 export 声明
			.replace(
				/^export\s+(?:const|let|var|function|class|default)\s+[\s\S]*?;/gm,
				"",
			)
			// 移除自闭合 JSX 标签 (如 <Component /> 或 <Icon name="..." />)
			.replace(/<[A-Z][A-Za-z0-9_]*(\s+[^>]*)?\/>/g, "")
			// 移除成对 JSX 容器标签但保留其内部子文本 (如 <Card>正文</Card> -> 正文)
			.replace(
				/<[A-Z][A-Za-z0-9_]*(\s+[^>]*)?>([\s\S]*?)<\/[A-Z][A-Za-z0-9_]*>/g,
				"$2",
			)
			// 移除 JSX 注释 {/* ... */}
			.replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
			.trim()
	);
}

function stripInvalidXmlChars(str: string): string {
	return str.replace(
		// biome-ignore lint/suspicious/noControlCharactersInRegex: https://www.w3.org/TR/xml/#charsets
		/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFDD0-\uFDEF\uFFFE\uFFFF]/g,
		"",
	);
}

export async function GET(context: APIContext): Promise<Response> {
	const blog = await getSortedPosts();

	return rss({
		title: siteConfig.title,
		description: siteConfig.subtitle || "No description",
		site: context.site ?? siteConfig.site,
		items: blog.map((post) => {
			const isEncrypted = isEncryptedPost(post.data);
			let contentHtml: string;

			if (isEncrypted) {
				const notice = i18n(I18nKey.postRssEncryptedNotice);
				contentHtml = `<p><em>🔒 ${notice}</em></p>`;
			} else {
				const isMdx =
					post.filePath?.endsWith(".mdx") || post.id.endsWith(".mdx");
				const rawContent =
					typeof post.body === "string" ? post.body : String(post.body || "");
				const contentToRender = isMdx
					? sanitizeMdxForFeed(rawContent) || post.data.description || ""
					: rawContent;
				const cleanedContent = stripInvalidXmlChars(contentToRender);
				contentHtml = sanitizeHtml(parser.render(cleanedContent), {
					allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
				});
			}

			return {
				title: isEncrypted ? `🔒 ${post.data.title}` : post.data.title,
				pubDate: post.data.published,
				description:
					isEncrypted && post.data.hideHomeContent
						? i18n(I18nKey.postEncryptedSummary)
						: post.data.description || "",
				link: url(`/posts/${post.id}/`),
				content: contentHtml,
			};
		}),
		customData: `<language>${siteConfig.lang}</language>`,
	});
}

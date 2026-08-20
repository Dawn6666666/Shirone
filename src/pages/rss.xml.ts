import rss from "@astrojs/rss";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { getSortedPosts } from "@utils/content-utils";
import { url } from "@utils/url-utils";
import { isEncryptedPost } from "@utils/post-encryption";
import type { APIContext } from "astro";
import MarkdownIt from "markdown-it";
import sanitizeHtml from "sanitize-html";
import { siteConfig } from "@/config";

const parser = new MarkdownIt();

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
		site: context.site ?? "https://shirone.mysqil.com",
		items: blog.map((post) => {
			const isEncrypted = isEncryptedPost(post.data);
			let contentHtml: string;

			if (isEncrypted) {
				const notice = i18n(I18nKey.postRssEncryptedNotice);
				contentHtml = `<p><em>🔒 ${notice}</em></p>`;
			} else {
				const content =
					typeof post.body === "string" ? post.body : String(post.body || "");
				const cleanedContent = stripInvalidXmlChars(content);
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

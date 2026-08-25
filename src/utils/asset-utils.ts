import path from "node:path";

/**
 * 把本地相对资源路径解析为构建产物 URL。
 * 基于 import.meta.glob 静态收集（需放在 util 层，glob 相对本文件 src/utils/ 解析），
 * 公开路径（/…）与远程（http/data:）原样返回；文件缺失时回退原路径。
 */
export async function resolveAsset(
	src: string,
	basePath = "",
): Promise<string> {
	if (!src) return src;
	const isLocal = !(
		src.startsWith("/") ||
		src.startsWith("http") ||
		src.startsWith("https") ||
		src.startsWith("data:")
	);
	if (!isLocal) return src;
	const files = import.meta.glob<{ src: string }>("../**/*.{png,jpg,jpeg,webp,avif,svg,gif}", {
		import: "default",
	});
	const normalizedPath = path
		.normalize(path.join("../", basePath, src))
		.replace(/\\/g, "/");
	const file = files[normalizedPath];
	if (!file) return src;
	const mod = await file();
	return mod.src;
}

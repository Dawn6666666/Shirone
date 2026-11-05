// QQ 头像同源代理。
//
// 分享海报用 fetch() 拉取头像,而 qlogo 接口既无 CORS 头又是 http 协议,
// 浏览器直接请求必然失败。此函数在边缘节点服务端回源 qlogo,
// 让浏览器只与同源的 /api/avatar 通信:无 CORS 检查、无混合内容,
// 同时保留 QQ 头像的实时同步语义(每次缓存过期后取最新头像)。

const UPSTREAM =
	"http://q.qlogo.cn/headimg_dl?dst_uin=3255235912&spec=640&img_type=jpg";

export default function onRequest(context) {
	return proxyAvatar();
}

async function proxyAvatar() {
	try {
		const upstream = await fetch(UPSTREAM, { redirect: "follow" });
		if (!upstream.ok || !upstream.body) {
			return new Response("avatar upstream unavailable", { status: 502 });
		}
		const headers = new Headers();
		headers.set(
			"Content-Type",
			upstream.headers.get("Content-Type") ?? "image/jpeg",
		);
		// QQ 头像变更频率低:浏览器缓存 1 天,减少海报生成时的回源请求。
		headers.set("Cache-Control", "public, max-age=86400");
		// 同源请求不触发 CORS 检查,带上头是为将来可能的跨域使用留余地。
		headers.set("Access-Control-Allow-Origin", "*");
		return new Response(upstream.body, { status: 200, headers });
	} catch {
		// 上游失败时返回 502,海报绘制方(loadDrawableImage)会优雅降级为首字母占位符。
		return new Response("avatar upstream error", { status: 502 });
	}
}

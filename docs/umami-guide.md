# Umami 统计集成指南

本项目使用 [oddmisc](https://www.npmjs.com/package/oddmisc) 集成 Umami 网站统计。

## 快速开始

### 1. 启用统计

编辑 `src/config/umamiConfig.ts`：

```ts
import type { UmamiConfig } from "@/types/umamiConfig";
import { withUserConfig } from "../utils/config-overlay.ts";

export const umamiConfig: UmamiConfig = withUserConfig("umami", {
  enable: true,
  shareUrl: "https://your-umami-instance.com/share/<shareId>",
});
```

启用内容分离（`external`）模式时，无需修改主题代码仓。在内容仓创建
`config/umami.yaml`，写入需要覆盖的字段即可：

```yaml
# 内容仓/config/umami.yaml
enable: true
shareUrl: https://your-umami-instance.com/share/<shareId>
```

配置覆盖会在 `content:sync` 时自动编译并合并到主题默认值；未填写的字段继续使用默认值。

### 2. 获取分享链接

在 Umami 后台：
1. 进入 **Settings** → **Share URL**
2. 创建新的分享链接
3. 复制生成的 URL（格式如下）

支持的 URL 格式：
- `https://umami.example.com/share/<shareId>`
- `https://cloud.umami.is/analytics/us/share/<shareId>`
- `https://umami.example.com/analytics/share/<shareId>`

## 零额外负担原则

- `enable: false` 时：零网络请求、零 DOM、零包体积
- 仅当 `enable: true` 且 `shareUrl` 有效时才注入 oddmisc 运行时

## 客户端 API

启用后，浏览器控制台可用 `window.oddmisc`：

```js
// 站点整体统计
const site = await window.oddmisc.getSiteStats();

// 指定页面统计
const about = await window.oddmisc.getPageStats("/about");

// 实时在线访客
const live = await window.oddmisc.getActiveVisitors();

// 就绪事件
window.addEventListener("oddmisc-ready", (e) => {
  e.detail.client.getSiteStats().then(console.log);
});
```

## 返回结构

```ts
interface StatsResult {
  pageviews: number;
  visitors: number;
  visits: number;
  bounces?: number;
  totaltime?: number;
  comparison?: {
    pageviews?: number;
    visitors?: number;
    visits?: number;
    bounces?: number;
    totaltime?: number;
  };
  _fromCache?: boolean;
}
```

## 缓存机制

- 内存 + localStorage 双级缓存
- 默认 TTL：1 小时（由 oddmisc 管理）
- 缓存命中时返回值带 `_fromCache: true`
- `client.clearCache()` 可清空缓存

## 错误处理

所有错误继承自 `UmamiError`（带 `code` 与可选 `status`）：

- `UmamiUrlError` — `INVALID_URL`，无效分享链接
- `UmamiAuthError` — `AUTH_FAILED`，401，shareId 失效
- `UmamiNetworkError` — `NETWORK_ERROR`，非预期状态码
- `UmamiTimeoutError` — `TIMEOUT`，请求超时（默认 10s）

## Node 端使用

```ts
import { createUmamiClient } from "oddmisc";

const client = createUmamiClient({
  shareUrl: "https://your-umami-instance.com/share/<shareId>",
});

const page = await client.getPageStats("/about");
const site = await client.getSiteStats();
const series = await client.getPageviews({
  startAt: Date.now() - 24 * 3600_000,
  endAt: Date.now(),
  unit: "hour",
  timezone: "Asia/Shanghai",
});
const topPaths = await client.getMetrics("path", { limit: 10 });
```

## 浏览器兼容性

现代浏览器（Chrome 60+、Firefox 60+、Safari 12+）；需要 `fetch`、`URL`、`AbortController`、`localStorage`。

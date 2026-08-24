# Lighthouse 本地审计

Shirone 的 Lighthouse 审计针对完整生产构建，不针对 Astro dev server。审计由 Lighthouse CI CLI 驱动，使用 astro preview 提供 dist，结果只写入本地报告目录。

## 快速开始

在项目根目录执行：

    pnpm.cmd lighthouse

该命令依次执行完整 pnpm.cmd build、启动 preview、采集 Lighthouse、运行断言，并在结束时停止 preview。桌面和移动设备可以分别运行：

    pnpm.cmd lighthouse:desktop
    pnpm.cmd lighthouse:mobile

三个命令会自动完成构建，不应再同时手动启动 pnpm.cmd dev 或 pnpm.cmd preview。

## 分步执行

需要单独检查采集或断言时，可使用：

    pnpm.cmd lighthouse:collect
    pnpm.cmd lighthouse:assert

lighthouse:collect 使用现有 dist 启动 preview，并将采集结果保存到 .lighthouseci 和 artifacts/lighthouse。分步执行前应先运行 pnpm.cmd build；日常开发不要把 dev server 的结果当作生产审计结论。

## 审计范围

首批矩阵包含以下 URL：

- /
- /?post-list-mode=grid
- /archive/
- /moments/
- /about/
- /posts/guide/
- /posts/mdx-showcase/

每个 URL 默认采集 3 次。配置位于根目录 lighthouserc.cjs。网格首页通过审计脚本注入 localStorage 状态；普通首页不会被改变。审计脚本还等待主题变量和页面入场动画收敛，避免把中间帧作为结果。

首期启用 performance、accessibility、best-practices 和 seo，不启用 pwa。Lighthouse 不替代 astro check、TypeScript、manifest、Playwright、axe 或视觉回归测试。

## 断言与报告

当前门禁分层如下：

- accessibility、seo：低于 0.8 失败；
- best-practices：低于 0.7 警告；
- performance：低于 0.5 警告；
- CLS 数值超过 0.1 失败。

性能分数和 LCP/FCP/TBT 等指标会受本机 CPU、浏览器和后台任务影响，因此首期性能类别采用 warning。阈值只能在至少三次稳定基线和明确变更理由后调整，不应通过关闭规则掩盖回归。

报告目录：

- artifacts/lighthouse：HTML、JSON 和本地可读报告，已加入 Git 忽略；
- .lighthouseci：LHCI 临时采集数据，已加入 Git 忽略。

不要把包含文章内容或站点 URL 的报告上传到未经批准的远程 LHCI 服务。

## 排查顺序

1. 确认 pnpm.cmd build 单独通过，并检查 preview 是否能访问 http://127.0.0.1:4321/。
2. 查看报告中的 URL、设备和 category，区分单页回归与全局环境波动。
3. 先处理 SEO、无障碍和 CLS 失败，再分析性能 warning。
4. 若出现随机失败，确认主题初始化、入场动画和图片加载是否完成，并重复运行三次。
5. 检查端口是否被旧 preview 占用：pnpm.cmd astro preview status；必要时执行 pnpm.cmd astro preview stop。

Lighthouse 工作流目前只在本地运行，不修改 .github。CI 接入需要单独评审固定 Node/Chrome 环境、报告保留和隐私策略。

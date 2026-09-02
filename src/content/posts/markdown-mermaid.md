---
title: Mermaid 图表全景展示
published: 2024-05-02
description: 包含流程图、时序图、数据模型、进度甘特图、思维导图以及项目历史的 Mermaid 图表示例集锦。
tags: [演示, 示例, Markdown, Mermaid]
category: 示例
lang: zh_CN
draft: false
---

Mermaid 能够将 Markdown 中的文本描述直接转换为可视化图表。以下示例结合 Shirone 的内容工作流，展示了技术文章和项目手记中常用的各种图表类型。

## 流程图

流程图用于描述业务处理流程，包括条件决策以及回退重试路径。

```mermaid
flowchart TD
    accTitle: 文章发布流程
    accDescr: 文章在正式发布前经历编写、校验、预览与构建。若校验失败则返回修改。
    Draft[编写 Markdown] --> Check{校验是否通过?}
    Check -->|否| Revise[修改文章内容]
    Revise --> Check
    Check -->|是| Preview[本地效果预览]
    Preview --> Build[构建静态页面]
    Build --> Publish[正式发布上线]
```

## 时序图

时序图按时间顺序展示不同参与角色之间的协同调用。此示例展示了从发起 Swup 站内跳转到 Mermaid 图表完成渲染的过程。

```mermaid
sequenceDiagram
    accTitle: 站内跳转后的图表渲染时序
    accDescr: 读者触发导航，Swup 平滑替换正文区域，Mermaid 渲染器在新页面上增强图表。
    actor Reader as 读者
    participant Browser as 浏览器
    participant Swup as Swup 容器
    participant Content as 文章正文区
    participant Renderer as Mermaid 渲染器
    Reader->>Browser: 点击其他文章链接
    Browser->>Swup: 发起站内无刷新跳转
    Swup->>Content: 替换页面正文内容
    Swup-->>Renderer: 触发 content:replace 事件
    Renderer->>Content: 检索 Mermaid 图表容器
    Renderer-->>Browser: 挂载主题化 SVG 图表
```

## 实体关系图

实体关系图用于为结构化数据建模，清晰展示作者、文章、标签和评论之间的关联。

```mermaid
erDiagram
    accTitle: 博客内容实体关系
    accDescr: 作者撰写文章，文章接收评论，关联表将文章连接到多个标签。
    AUTHOR ||--o{ POST : 撰写
    POST ||--o{ COMMENT : 接收
    POST ||--o{ POST_TAG : 归类
    TAG ||--o{ POST_TAG : 分组
    AUTHOR {
        string id PK
        string display_name
    }
    POST {
        string slug PK
        string title
        datetime published_at
        string author_id FK
    }
    COMMENT {
        string id PK
        string post_slug FK
        string body
    }
    TAG {
        string id PK
        string label
    }
    POST_TAG {
        string post_slug FK
        string tag_id FK
    }
```

## 类图

类图在软件设计中用于传达职责分工、公开方法与依赖流向。

```mermaid
classDiagram
    accTitle: Markdown 渲染模块类图
    accDescr: 内容管道利用 Mermaid 插件生成兜底标签，客户端渲染器随后将其增强为 SVG 图表。
    class ContentPipeline {
        +render(markdown)
        +collectMetadata()
    }
    class MermaidPlugin {
        +transform(codeFence)
        +createFallback()
    }
    class DiagramRenderer {
        +initialize()
        +renderAll()
        +refreshTheme()
    }
    class ThemeTokens {
        +primary
        +surface
        +outline
    }
    ContentPipeline --> MermaidPlugin : 调用
    DiagramRenderer --> MermaidPlugin : 增强产物
    DiagramRenderer --> ThemeTokens : 读取令牌
```

## 状态图

状态图展示对象的完整生命周期以及触发状态转移的事件。

```mermaid
stateDiagram-v2
    accTitle: 文章生命周期状态图
    accDescr: 文章从草稿进入审核并发布，期间可撤回修改，或最终归档。
    [*] --> 草稿
    草稿 --> 审核中 : 提交审核
    审核中 --> 草稿 : 要求修改
    审核中 --> 已发布 : 审核通过
    已发布 --> 草稿 : 撤回重修
    已发布 --> 已归档 : 归档处理
    已归档 --> [*]
```

## 坐标图

坐标图通过组合柱状图与折线图，在共享坐标轴上直观对比数值与变化趋势。

```mermaid
xychart-beta
    accTitle: 六周内容运营表现
    accDescr: 柱状图展示归一化后的每周发文量，折线展示阅读完成率。
    title "六周内容运营表现"
    x-axis "周次" [1, 2, 3, 4, 5, 6]
    y-axis "相对评分" 0 --> 100
    bar [36, 52, 44, 68, 76, 84]
    line [48, 55, 62, 61, 73, 81]
```

## 饼图

饼图适合紧凑直观地呈现各个类别在整体中所占的份额比例。

```mermaid
pie showData
    accTitle: 文章主题分类占比
    accDescr: 工程技术占百分之四十，设计系统占百分之二十五，其余为指南与随笔。
    title 文章主题分类占比
    "工程技术" : 40
    "设计系统" : 25
    "使用指南" : 20
    "随笔思考" : 15
```

## 甘特图

甘特图按日历时间线清晰规划任务、依赖关系与关键里程碑。

```mermaid
gantt
    accTitle: 主题版本发布计划
    accDescr: 发布计划从需求评审与交互设计推进至组件开发、系统测试与最终发布。
    title 主题版本发布计划
    dateFormat YYYY-MM-DD
    axisFormat %m/%d
    section 方案设计
    确认核心需求 :done, brief, 2024-05-06, 2d
    完善交互设计 :done, interaction, after brief, 3d
    section 功能研发
    组件开发实现 :active, components, after interaction, 6d
    编写示例文章 :examples, after interaction, 4d
    section 质量验证
    自动化测试套件 :tests, after components, 3d
    正式版本发布 :milestone, release, after tests, 0d
```

## 思维导图

思维导图以核心主题为中心，向外辐射发散至各个关联领域与细分概念。

```mermaid
mindmap
  root((Shirone))
    内容体验
      Markdown 扩展
      全文检索
      图表引擎
    界面系统
      M3E 令牌
      响应式布局
      动态配色
    工程质量
      Astro Check
      Playwright 测试
      无障碍体验
```

## 时间线

时间线用于概述关键里程碑事件或演进阶段，无需依赖精确的日历时长。

```mermaid
timeline
    title Mermaid 渲染支持演进历程
    管道设计 : 识别 Mermaid 代码块
             : 保留源码兜底展示
    客户端增强 : 按需动态加载运行时
               : 应用主题设计令牌
    稳定性保障 : 支持 Swup 客户端跳转
               : 验证响应式与无障碍输出
```

## 用户旅程图

用户旅程图综合了任务各阶段的操作行为、参与角色与满意度评分。

```mermaid
journey
    accTitle: 读者阅读理解技术文章的旅程
    accDescr: 读者发现文章，通过结合文字与图表加深理解，并继续探索相关主题。
    title 读者阅读理解技术文章的旅程
    section 发现文章
      浏览文章列表: 4: 读者
      选择感兴趣的主题: 5: 读者
    section 阅读理解
      通读正文内容: 4: 读者
      查阅架构关系图: 5: 读者
    section 持续探索
      打开相关关联文章: 4: 读者
      收藏文章页面: 3: 读者
```

## Git 分支图

Git 分支图展示特性分支在最终合并回主干前的提交推进过程。

```mermaid
gitGraph
    accTitle: Mermaid 特性分支开发历史
    accDescr: 特性分支完成渲染器与测试用例开发，随后合并入主分支并发布。
    commit id: "基线版本"
    branch mermaid
    checkout mermaid
    commit id: "添加渲染器"
    commit id: "完善测试用例"
    checkout main
    merge mermaid id: "合并图表支持"
    commit id: "正式发布"
```

## 看板

看板按工作流状态对任务进行分组，使当前推进进度一目了然。

```mermaid
kanban
  backlog[待办事项]
    docs[编写作者使用文档]
    examples[扩充图表示例数据]
  active[进行中]
    themes[验证主题配色适配]
  complete[已完成]
    fallback[源码安全兜底]
    rendering[客户端动态渲染]
```

## 桑基图

桑基图通过连线宽度直观展示流量或数据在各个节点之间的流向与分配。

```mermaid
sankey-beta
着陆页,正文阅读,720
发现页,正文阅读,430
正文阅读,深度探索,360
正文阅读,主题分类,210
正文阅读,站外跳转,140
```

每个示例均使用标准的 `mermaid` 代码块声明。服务端保留语义化源码，浏览器将其增强为契合当前主题的 SVG 矢量图表。当主题切换或通过 Swup 跳转进入时，图表会自动重新渲染。
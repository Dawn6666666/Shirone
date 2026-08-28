# 内容分离：独立内容仓库与双仓构建

> 本文约定「主题代码」与「站点内容」的仓库边界、物化规则、命令入口与双仓 CI 接线。
> 资产目录边界见 `docs/asset-pipeline.md`；配置契约见 `src/config/README.md`。

---

## 两种模式

| 模式 | 触发条件 | 行为 |
| --- | --- | --- |
| `local`（默认） | 未设置 `CONTENT_DIR` / `CONTENT_REPO_URL`（且根目录 `.env` 未指定），且仓库根目录没有 `shirone.content.json` | 使用仓库自带内容。`pnpm content:sync` 是**完全静默的空操作**，`pnpm dev` 与 `pnpm build` 的行为与引入内容分离前一致 |
| `external` | 上述任一来源存在（环境变量、根目录 `.env` 或 `shirone.content.json`） | 内容来自独立的内容仓库，构建前由 `content:sync` 物化到仓内标准路径 |

上游主题仓保持 `local` 模式并继续跟踪 demo 内容，因此主题使用者 clone 后不受任何影响。
切换到 `external` 是使用者在自己 fork 里的一次性动作，见下文「迁移」。

## 为什么是「物化」而不是让 Astro 直读内容仓

三个硬约束决定了这个选择：

1. `src/utils/asset-utils.ts`、`src/components/molecules/ImageWrapper.astro` 与
   `src/components/organisms/PostCard.astro` 用 `import.meta.glob("../**/*.{png,jpg,...}")`
   解析用户图片。glob 模式必须是静态字面量，解析基准是 `src/`，因此用户图片物理上必须落在 `src/` 之下。
2. `astro.config.mjs` 在 Astro 启动前由 Node 同步 import 配置文件，此时 Vite 插件链尚未生效，
   配置层无法异步拉取远端内容。
3. 文章内的相对图片引用（`![](./cover.jpeg)`）若位于 `src/` 之外，需要额外放开 Vite 的 `server.fs.allow`，
   语义更脆。

物化的代价只是一次增量目录拷贝，换来的是构建链、`content.config.ts` 与全部现存配置写法**零改动**。

## 内容仓目录契约

```text
shirone-content/
├── shirone.content.json        # 可选：内容仓自己的元数据
├── config/                     # -> 编译进 src/user/user-config.ts
│   ├── site.yaml  profile.yaml  sidebar.yaml  nav-bar.yaml  ...
│   └── footer.html             # -> src/config/FooterConfig.html
├── content/                    # -> src/content/
│   ├── posts/
│   ├── moments/
│   └── spec/
├── data/                       # -> src/data/
│   ├── projects.ts  skills.ts  timeline.ts
│   ├── devices.ts   friends.ts compass.ts  music.ts  anime.ts
│   └── anime-snapshots/
├── assets/                     # -> src/assets/（参与构建期 AVIF/WebP 优化）
│   └── images/
└── public/                     # -> public/（原样拷贝）
    ├── images/
    └── assets/
```

`assets/ -> src/assets/` 与 `public/ -> public/` 的映射保持了路径语义，
因此 `banner.src: "assets/images/banner/desktop/1.webp"` 这类现存写法无需改动。

`config/` 是唯一不走目录拷贝的入口：它会被编译成一份带类型标注的
`src/user/user-config.ts`，详见下文「配置覆盖」。

未挂载的目录（`docs/`、`templates/`、`README.md`、内容仓自己的 `.github/`）不会被物化，
也不应触发站点重建。内容仓中出现未声明的顶层目录时，`content:sync` 会给出告警。

**内容仓禁止存放密钥。** `BILI_SESSDATA` 等继续走 GitHub Secrets 与环境变量。

## 配置覆盖

内容仓的 `config/` 下每个 YAML 文件覆盖主题里的一个配置领域。它不是目录拷贝：
`content:sync` 会把这些 YAML 编译成 `src/user/user-config.ts`，
再由各 `src/config/<domain>Config.ts` 里的 `withUserConfig()` 在构建期深合并。

```text
config/site.yaml  ──编译──▶  src/user/user-config.ts  ──深合并──▶  siteConfig
     (用户覆盖)                    (生成物，带类型标注)              (主题默认值 ⊕ 覆盖)
```

### 只写想改的键

覆盖层**不含默认值**，只含用户显式写下的键：

```yaml
# config/site.yaml
title: 我的博客
themeColor:
  hue: 262
```

`themeColor.fixed`、`themeColor.style` 等没写的键继续走主题默认值，
**主题升级时新增的默认值会自动生效**。这正是不把整份配置快照倒进内容仓的原因——
那样等于把配置冻结在 eject 那一刻的主题版本上。

合并规则是**对象递归合并、数组整体替换**。数组不做逐项合并：`sidebar.components`、
`profile.links` 这类清单的语义是「这就是我要的全部条目」，逐项合并会让「删掉一项」无法表达。
因此想改清单里的一项，要把整个清单写全。

### 文件与领域的对应

| 文件 | 覆盖的配置 | 文件 | 覆盖的配置 |
| --- | --- | --- | --- |
| `site.yaml` | `siteConfig` | `skills.yaml` | `skillsConfig` |
| `profile.yaml` | `profileConfig` | `projects.yaml` | `projectsConfig` |
| `sidebar.yaml` | `sidebarConfig` | `timeline.yaml` | `timelineConfig` |
| `nav-bar.yaml` | `navBarConfig` | `devices.yaml` | `devicesConfig` |
| `post-list.yaml` | `postListConfig` | `music.yaml` | `musicConfig` |
| `article.yaml` | `articleConfig` | `anime.yaml` | `animeConfig` |
| `comment.yaml` | `commentConfig` | `font.yaml` | `fontConfig` |
| `announcement.yaml` | `announcementConfig` | `license.yaml` | `licenseConfig` |
| `fab.yaml` | `fabConfig` | `image-bloom.yaml` | `imageBloomConfig` |
| `footer.yaml` | `footerConfig` | `expressive-code.yaml` | `expressiveCodeConfig` |
| `llms.yaml` | `llmsConfig` | | |

各领域的可用键、默认值与逐项注释以代码仓的 `src/config/<domain>Config.ts` 为准——
**注释就是配置文档**，本表不重复它。`.yml` 后缀同样接受；空文件与纯注释文件视作没有覆盖。

`config/footer.html` 是唯一的非 YAML 入口，原样拷贝到 `src/config/FooterConfig.html`，
需要同时在 `footer.yaml` 里 `enable: true` 才会注入。

`config/llms.yaml` 覆盖 `/llms.txt` 与 `/llms-full.txt` 的生成行为（A 级纯数据领域，
不含任何函数或预设引用，因此走标准的「默认值 ⊕ 覆盖」）：

```yaml
# config/llms.yaml
siteSummary: 一个关注 Web 与设计系统的中文技术博客
generateFull: true
descriptionMaxLength: 200
excludeTags:            # 数组整体替换：命中任一标签的文章不进 LLM 产物
  - secret
  - private
  - 日记
corePages:              # 整体替换默认的 Home / About / Archive
  - title: 首页
    url: /
    description: 最新文章流入口
  - title: 关于
    url: /about/
    description: 作者资料与技术栈
customSections:
  - title: Open Source
    description: 作者维护的开源项目
    items:
      - title: Shirone
        url: https://github.com/LyraVoid/Shirone
        description: Astro 的 M3E 博客主题
```

`siteSummary` 留空时自动回退到 `siteConfig.subtitle` 或 `profileConfig.bio`。
这里写下的中文文本会被 `scripts/fonts/text-collector.mjs` 通过 `src/user/` 纳入字形收集，
因此不会在子集字体里缺字。

### 校验：用主题自己的类型，而不是第二套 schema

`src/types/*Config.ts` 已经是配置契约的唯一真源，再写一份 Zod / JSON Schema 只会漂移。
因此生成物给每个领域打上类型标注，然后用一份只含该文件的 tsconfig 跑 `tsc`：

```ts
// src/user/user-config.ts（生成物节选）
const site: DeepPartial<SiteConfig> = {
	title: "我的博客",
	themeColor: { hue: 262 },
};
```

错误会带着 TypeScript 的诊断信息翻译回内容仓的文件与键路径：

```text
[content] 内容仓的配置没有通过类型校验：
  config/profile.yaml 的 bioo：Object literal may only specify known properties,
    but 'bioo' does not exist in type '{ avatar?: ...; name?: ...; bio?: ... }'.
    Did you mean to write 'bio'?
  config/post-list.yaml 的 layout.mode：Type '"gird"' is not assignable to type 'PostListMode'.
```

拼错的键、越界的枚举、填错的类型都会让同步失败，不会被静默忽略。
校验只在生成物内容变化时触发（约 2~3 秒），并且**以「上次校验通过的摘要」为准**——
一次失败的构建不会因为「文件没变」而在下一次同步中被放行。

另外两类问题在解析阶段就被拦下，因为它们的 TypeScript 报错不够直白：

- `title:` 写了键却没给值（YAML 解析成 `null`，深合并会把标题整个抹掉）；
- `config/sidbar.yaml` 这样的文件名拼错，会附带「你是不是想写 `sidebar.yaml`？」。

### `nav-bar.yaml`：唯一的声明式子集

导航项要引用主题内置的 `LinkPresets` 并调用 `i18n()`，没法用「默认值 ⊕ 覆盖」表达，
因此它写的是一份声明式条目列表，**整体替换**默认导航：

```yaml
# config/nav-bar.yaml
links:
  - preset: Home            # 引用内置预设
  - preset: Archive
  - preset: GitHub
    url: https://github.com/me/my-blog   # 预设 + 局部覆盖
  - name: 留言板            # 完全自定义的链接
    url: /guestbook/
    icon: material-symbols:chat-outline-rounded
  - name: $t:more           # $t: 前缀引用 i18n 词条
    icon: material-symbols:apps-rounded
    children:               # 下拉分组，children 递归使用同一套写法
      - preset: Timeline
      - preset: About
```

可用预设见 `src/config/navBarConfig.ts` 的 `LinkPresets`；
预设名或 i18n 词条写错时，构建加载配置时会报错并列出全部可用值。

### 生成物

`src/user/user-config.ts` 由 `content:sync` 写出，**不要手工编辑**。

它放在 `src/user/` 而不是 `src/generated/`，因为 `scripts/icons/generate-local-icons.mjs`
会跳过 `src/generated/`——只在用户配置里出现的图标（如 `profile.links[].icon`）会因此漏扫。
同理，`scripts/fonts/text-collector.mjs` 也把 `src/user/` 纳入字形收集范围，
否则 external 模式下站点标题、公告这些只存在于覆盖层的文本会在子集字体里缺字。

`local` 模式下该文件是一份空覆盖，且与仓库中已提交的版本逐字节相同：
主题使用者 clone 后跑 `pnpm content:sync`，`git status` 依然干净。

## 物化规则

### 挂载与裁剪

裁剪（删除代码仓中已不存在于内容仓的文件）**只发生在内容仓确实拥有的顶层段内**：

| 情形 | 结果 |
| --- | --- |
| 内容仓有 `content/posts/`，代码仓有旧的 `src/content/posts/demo.md` | 删除 demo |
| 内容仓没有 `content/spec/` | `src/content/spec/` 原样保留 |
| 内容仓有 `assets/images/`，没有 `assets/fonts/` | `src/assets/fonts/` 原样保留 |
| 内容仓有 `public/assets/banner/` | `public/favicon/` 原样保留（顶层段不同） |

这条规则让「主题自有资产」与「用户内容」可以共存于同一个目录树而互不干扰。

### 构建期生成物豁免

以下路径与内容仓可能拥有的目录共享顶层段，因此显式豁免：既不参与裁剪，也不接受内容仓覆盖。
内容仓若提供同名文件，`content:sync` 会直接报错。

- `public/assets/moments/thumbnails/**`
- `public/assets/anime/covers/**`
- `src/assets/fonts/.subset/**`

### `keep`：代码仓自有文件

`shirone.content.json` 的 `keep` 用于声明「即使落在挂载点内，也属于代码仓」的文件：

```json
{ "keep": ["src/data/theme-owned.ts"] }
```

`keep` 中的路径不会被裁剪。**内容仓若提供同名文件，同步会报错而不是静默取舍**——
例外白名单靠人记住是不可靠的。

### 增量与幂等

拷贝按「大小 + mtime（1ms 容差）」判断，并在拷贝后回写源文件的 mtime，
因此重复运行不产生任何写入。

## 清单文件

代码仓根目录的 `shirone.content.json`（示例见 `shirone.content.example.json`）：

| 字段 | 说明 |
| --- | --- |
| `schemaVersion` | 清单结构版本，当前为 `1`。高于主题支持的版本时构建报错并提示升级主题 |
| `source.type` | `"path"`（本地目录）或 `"git"`（远端仓库） |
| `source.path` | `type: "path"` 时的目录，相对代码仓根目录解析 |
| `source.url` / `source.ref` | `type: "git"` 时的仓库地址与 ref；ref 可以是分支、标签或 commit SHA |
| `mounts` | 覆盖默认挂载表；值设为 `null` 可关闭某个挂载点 |
| `keep` | 见上文，支持 `**` 与 `*` |
| `prune` | 设为 `false` 时只拷贝不删除 |

## 环境变量与 `.env` 支持

系统会自动读取代码仓根目录下的 `.env` 与 `.env.local`，无需每次在终端手动 `export` 或 `$env:` 设置。来源优先级为：进程环境变量 > `.env.local` > `.env` > `shirone.content.json`；变量之间的决策优先级如下：

| 变量 | 作用 |
| --- | --- |
| `SHIRONE_CONTENT_SYNC=0` | 强制回到 `local` 模式（即使配置了内容源） |
| `CONTENT_DIR` | 本地内容目录，最高优先级；CI 中配合 `actions/checkout` 使用，本地可直接写在根目录 `.env` 中 |
| `CONTENT_REPO_URL` | 远端内容仓；私有仓用 `https://x-access-token:<TOKEN>@github.com/OWNER/REPO.git`，token 在所有日志与 `content.lock.json` 中都会被脱敏 |
| `CONTENT_REPO_REF` | 覆盖 ref（分支、Tag 或 Commit SHA） |
| `CONTENT_SYNC_PULL=false` | 复用已存在的 `.content-src/` 工作副本，不再 fetch |

空字符串等同于未设置，便于在 CI 中用空值关闭某个来源。

## 命令

| 命令 | 说明 |
| --- | --- |
| `pnpm content` / `pnpm content --help` | **全景帮助**：打印工具链指令总览与四维闭环关系 |
| `pnpm content:status` / `pnpm content status` | **状态诊断**：离线、只读地检测内容源、Git、挂载资产、配置类型、锁文件与物化新旧状态 |
| `pnpm content:sync` / `pnpm content sync` | 物化内容，写出 `content.lock.json`。已并入 `dev` / `start` / `build` 的首位 |
| `pnpm content:export` / `pnpm content export` | **反向导出**：把代码仓侧的改动回写内容仓。**默认只预演**，加 `--yes` 才执行 |
| `pnpm content:clean` / `pnpm content clean` | 清理物化内容与配置覆盖，恢复主题自带内容状态。**默认只预演**，加 `--yes` 才执行 |
| `pnpm content:watch` / `pnpm content watch` | 物化后持续监听本地内容目录，边写边同步（仅 `type: "path"`） |
| `pnpm content:validate` / `pnpm content validate` | `--dry-run`，只校验结构与冲突，不落盘 |
| `pnpm content:eject` / `pnpm content eject` | 一键解耦：一次性迁移到 `external` 模式，默认只预演 |

> 提示：所有指令均支持传统的冒号格式（如 `pnpm content:status`）以及现代的空格子命令格式（如 `pnpm content status`）。

### 状态诊断契约

`content:status` 默认不访问网络，也不创建缓存或临时文件。Git 子进程禁用 optional locks，配置覆盖通过 TypeScript 编译器 API 在内存中完成类型检查。它会区分以下结果：

- `0`：没有阻断问题；允许存在明确标出的非阻断告警，例如本机未安装 Git 时无法读取可选的 path 仓版本信息；
- `1`：配置无法解析、内容源缺失、远端工作副本身份不匹配、YAML/TypeScript 配置错误、锁文件损坏、commit 或物化文件过期等需要处理的问题；
- `pnpm content status --remote`：在本地检查之外显式执行 `git ls-remote`，确认远端仓库和目标 ref 当前可访问。只有这个选项会产生外部网络请求。

本地 path 内容源若本身是 Git 仓库，`content:sync` 会把当前 commit 写入 `content.lock.json`；普通非 Git 目录仍受支持，commit 为 `null`。锁文件也记录该次同步实际采用的 prune 策略，避免 `--no-prune` 保留的文件被误判为残留。status 会同时比较当前 commit、锁中的配置文件清单、挂载文件的大小与 mtime，以及生成的 `src/user/user-config.ts`，从而区分“已物化”“生成物被改动”和“内容源已更新但尚未同步”。

四条命令构成一个闭环：

```text
内容仓 ──content:sync──▶ 代码仓          物化
内容仓 ◀──content:export── 代码仓        反向导出
代码仓 ──content:clean──▶ 主题自带态      清理
内容仓 ◀──content:eject── 代码仓          一次性迁出
```

`content.lock.json`（已 gitignore）记录本次构建使用的内容源、内容 commit（Git 来源，包括 path Git）、配置文件清单与各挂载点统计，用于溯源与回滚。

## 本地开发

### 方式一：在 `.env` 中配置（最便捷）

在代码仓根目录新建 `.env`：

```bash
# .env
CONTENT_DIR="G:/Code/Blog/shirone-content"
```

随后直接运行：

```powershell
pnpm dev
```

`pnpm dev`、`pnpm build` 与 `pnpm content:sync` 会自动读取 `.env` 中的 `CONTENT_DIR`，无需额外配置。

### 方式二：终端临时指定环境变量

```powershell
$env:CONTENT_DIR = "..\shirone-content"
pnpm content:sync
pnpm dev
```

边写文章边预览时，另开一个终端运行 `pnpm content:watch`。

### 方式三：使用清单配置文件

`shirone.content.json` 里写成 `{ "source": { "type": "path", "path": "../shirone-content" } }`。

## 反向导出 (`content:export`)

`content:sync` 是单向的，而且带裁剪：在 `src/content/posts/` 里新写的文章，会在下一次
`pnpm dev`（首步就是 sync）被当成「内容仓已删除的文件」**直接删掉**。
`content:export` 补齐反方向的通道，把代码仓侧的改动先送回内容仓，再由 sync 正常物化回来。

```powershell
pnpm content:export                 # 预演：只打印导出计划
pnpm content:export --yes           # 实际执行
pnpm content:export --yes --config  # 只回写配置
```

与 `content:eject`、`content:clean` 一致，**默认只预演**。

| 参数 | 作用 |
| --- | --- |
| `--yes` | 实际执行（不加就只是预演；`--dry-run` 优先级更高，可用于脚本兜底） |
| `--config` / `--posts` | 只导出配置 / 只导出内容文件；都不给等于两者都导出 |
| `--prune` | 允许删除内容仓中代码仓已不存在的文件（**默认关闭**） |
| `--prune-config` | 允许删除内容仓 YAML 中「已等于主题默认值」的冗余键（**默认关闭**） |
| `--force` | 跳过「内容仓工作区干净」与「物化状态一致」两项检查 |
| `--out <dir>` | 覆盖导出目标（默认取当前生效的内容源目录） |

### 内容文件：挂载表反转

把当前生效的 `mounts` 反过来用（`src/content/` → `content/`），逐文件按 **SHA-256 内容哈希**比对，
分成新增 / 更新 / 跳过（哈希相同）/ 豁免四类。不用 mtime：`sync` 拷贝后会把源文件的 mtime
回写到目标，两侧 mtime 永远相同，反向比对时它只会说「一致」。

导出方向的顶层段规则与 sync 的裁剪规则对称——**只有内容仓确实拥有的顶层段才参与**。
因此 `public/favicon/`、`src/assets/fonts/` 这类主题自有目录和 `public/pagefind/` 这类构建产物
不会被倒进内容仓。未参与的顶层段会在计划里明确列出，不做静默丢弃。

永不导出的路径（内容仓持有它们会让 `content:sync` **直接报错**）：

- `public/assets/moments/thumbnails/**`、`public/assets/anime/covers/**`、`src/assets/fonts/.subset/**`
- `src/data/anime-snapshots/**`（外部 API 拉取的快照）与各目录的 `.gitkeep`
- `shirone.content.json` 的 `keep` 声明为代码仓自有的文件

文本文件比对前会抹平 `\r\n`：Windows `core.autocrlf=true` 的检出会把被跟踪的 Markdown 变成 CRLF，
按原始字节比会把整仓文本判成「全都变了」。写出时统一归一化成 LF，避免内容仓出现纯换行的假 diff。

### 配置：求 `deepMerge` 的逆

导出的是「当前生效配置」与「主题默认值」的差，也就是**用户必须写下的最小覆盖集**：

```text
diff(default, effective):
  两者深相等            → 省略（不写这个键）
  任一侧是数组且不相等  → 整体写出 effective 的数组（数组不逐项 diff）
  两侧都是纯对象        → 逐键递归，收集非空结果
  其余（标量/类型不同） → 写出 effective
```

规则与 `src/utils/config-overlay.ts` 的 `deepMerge` 逐条对应，因此
`deepMerge(defaults, diffConfig(defaults, effective)) ≡ effective`——喂回 sync 后生效配置逐字段不变。

「主题默认值」拿不到是这里的难点：`withUserConfig()` 返回的已经是合并后的值。解法是起一个子进程，
用 `module.register()` 把 `src/user/user-config.ts` 拦截成空覆盖层，再在该进程里 import 各配置模块，
`withUserConfig()` 于是原样返回默认值字面量。**不改任何运行时源码、不落盘、对客户端 bundle 零影响**，
默认值与生效值来自两个独立进程，ESM 模块缓存也不会串味。

其余约定：

- **保留注释与格式**：走 `yaml` 的 `parseDocument` + `setIn` 逐叶子写入，不做 `parse` → `stringify` 整文件重写，
  用户手写的文件头注释与行内注释原样保留；
- **只增改不删键**：内容仓里已有、但现在恰好等于默认值的键会被保留——用户写下它可能就是为了钉住这个值
  不跟随主题升级，静默删掉会改变意图。需要清理走显式的 `--prune-config`；
- **写后校验**：导出完立刻用 `readConfigOverrides()` + `generateModule()` + `typeCheckModule()`
  复查一遍，与 `content:sync` 是同一条校验路径。把过不了 `tsc` 的 YAML 留在内容仓，等于让内容仓的下一次 CI 直接红掉；
- **疑似凭据只告警不阻断**：键名形如 `token` / `secret` / `apiKey`，或值命中已知令牌前缀时给出警告。
  `sessdataEnv`（环境变量**名**）与 `twikoo.envId`（公开标识符）不会误报。

`config/footer.html` 同样反向导出，来源是 `src/config/FooterConfig.html`。

#### `nav-bar` 是唯一的例外

`navBarConfig` 不走 `withUserConfig()`，而是用 `getUserConfig("navBar")` 取原始覆盖，
再由 `resolveNavBarLinks()` 把 `{ preset: "Home" }` / `"$t:home"` 还原成 `NavBarLink`。
这一步**有损**：`i18n()` 与 `LinkPresets` 解析之后无法反推回声明式写法，硬凑出来的结果
一定会在某些配置下出错。因此 `config/nav-bar.yaml` 不纳入导出，请手工维护——
计划输出里会显式告知这一点，而不是静默跳过。

### 安全机制

导出是向**另一个 git 仓库**写入，比 clean 更危险，因此闸门更密：

1. **默认只预演**：计划分「新增 / 更新 / 跳过 / 豁免」四类，各给数量与前若干条路径；
2. **拒绝 `local` 模式**（没有内容仓可写）与 **`CI=true`**（这是本地开发命令，CI 里只该跑 sync）；
3. **拒绝 `type: "git"` 的内容源**：`.content-src/` 是 `--depth 1` + `checkout --detach FETCH_HEAD`
   的浅工作副本，往里写并提交会落在游离 HEAD 上直接丢失（与 `content:watch` 只支持 `type: "path"` 同源）。
   需要时用 `--out` 指向一份真正的本地检出；
4. **要求内容仓工作区干净**，否则拒绝并列出全部脏文件；`--force` 可跳过，但清单照样打印。
   内容仓不是 git 仓库时降级为告警。计划为空（没有任何可写内容）时不做这项检查，
   因此「导出后不提交、直接再跑一次确认幂等」不必被迫加 `--force`；
5. **校验物化状态**：生效配置读自 `src/user/user-config.ts`，它是上一次 sync 的产物。
   它与内容仓 `config/` 现状不一致时**拒绝执行**——否则导出会把过期的值写回去，
   静默盖掉你在内容仓那边的新改动。修复方式是先跑一次 `content:sync`；
6. **默认绝不删除**内容仓文件：「代码仓里没有」有太多良性解释（手工清理过物化产物、`keep` 生效、豁免路径）。
   `--prune` 才允许删除，且删除前必然先备份；
7. **快照备份**：所有将被覆盖或删除的文件先复制到内容仓的 `.export-backup/<timestamp>/`
   （首次运行会把该路径补写进内容仓的 `.gitignore`），附 `manifest.json` 记录两侧 HEAD、范围、统计与还原命令。
   中文路径同样完整备份（内部统一用 `core.quotepath=false` + `-z` 读取 git 路径）；
8. **失败即熔断**，并明确区分「未向内容仓写入任何内容」与「已写入部分文件（备份在 X）」；
9. **交叉校验 `content.lock.json`**：导出目标与上次同步记录的内容源对不上时告警，提示可能指错了仓库；
10. **收尾体检**：提示在内容仓 commit & push，并明确「代码仓的 `src/content/` 仍是物化产物，
    下次 sync 以内容仓为准」。

**本脚本绝不修改代码仓的 `.gitignore`、git 索引或 `shirone.content.json`**，也不会替你在内容仓 commit / push。

### 与 `content:eject` 的边界

| | `content:eject` | `content:export` |
| --- | --- | --- |
| 执行次数 | 一次性 | 可反复 |
| 目标目录 | 必须为空或 `--force` | 必须是**已存在**的内容仓 |
| 改代码仓 `.gitignore` / git 索引 / `shirone.content.json` | 会 | **绝不** |
| 导出范围 | 写死子目录的白名单 | 按当前生效的 `mounts` 反转 |
| 配置产出 | 只倒「站点身份」起步文件（刻意不全量，避免冻结主题版本） | 按 diff 增量回写全部可导出领域 |
| 生成 README / workflow 起步文件 | 会 | 不会 |

两者的规则表刻意**不共用**：eject 的白名单是「一次性迁出用户内容」的语义，
强行复用会在 `mounts` 被自定义时导出到错误的位置。

### 它不做的事

`content:export` 回写的是**覆盖层**，不会把 `src/config/*Config.ts` 里的本地源码改动提升成覆盖。
在工作区改了配置模块的默认值字面量时，「主题默认值」与「生效值」同步变化，差分结果为空，
因此那处改动不会出现在导出计划里。这是有意为之——把此刻的默认值提升成内容仓的永久覆盖，
等于把配置冻结在这一版主题上，日后主题新增的默认值再也进不来（`content:eject` 只倒站点身份，同源于此）。
真要固化这类改动，请在 fork 里提交它，或照常在内容仓写一条对应的 YAML 覆盖。



从物化状态回到「主题自带内容」的状态：

```powershell
pnpm content:clean          # 预演：只打印清理计划
pnpm content:clean --yes    # 实际执行
```

与 `content:eject` 一致，**默认只预演**。可用参数：

| 参数 | 作用 |
| --- | --- |
| `--yes` | 实际执行清理（不加就只是预演；`--dry-run` 优先级更高，可用于脚本兜底） |
| `--no-backup` | 跳过 `.content-backup/` 快照备份（不推荐） |
| `--keep-working-copy` | 保留 `.content-src/`，下次同步不必重新 fetch |

### 清理范围

严格限定在**挂载目标 + 配置生成物**之内：`src/content/`、`src/data/`、`src/assets/`、`public/`、
`src/user/user-config.ts`、`src/config/FooterConfig.html`（挂载表被 `mounts` 覆盖时按实际挂载点解析）。

**主题源码里的未提交改动不在范围内**，不会被回滚——这是它与 `git checkout -- src/` 的根本区别。
若某个挂载点被配成 `src` 或仓库根这类过宽的目录，清理会直接拒绝执行，而不是拿 `git clean -x`
去碰未提交的源码。

三类文件的处理方式不同：

| 文件状态 | 典型来源 | 处理 |
| --- | --- | --- |
| 被跟踪且有改动/被裁剪 | 物化覆盖或删掉的 demo 内容 | `git restore` 回 HEAD |
| 未跟踪 | 尚未 eject 的仓库里新物化进来的文章 | 备份后删除 |
| 被 `.gitignore` 忽略 | **eject 之后**的全部物化内容 | 备份后删除（`git clean -x`） |

第三类最容易被忽略：`content:eject` 会把 `/src/content/` 等路径写进 `.gitignore`，此后 `git status`
对它们完全沉默。只看 status 的清理逻辑会「什么都没清掉却报告成功」，因此清理走的是
`git ls-files --others --ignored`，而不是 `git status`。

### 豁免路径

以下路径既不备份也不删除，与 `sync.mjs` 的 `PROTECTED_PATHS` 同一套语义（重建代价高，
番剧封面还要打外部 API）：

- `public/assets/moments/thumbnails/**`（说说缩略图）
- `public/assets/anime/covers/**` 与 `src/data/anime-snapshots/**`（番剧封面与快照）
- `src/assets/fonts/.subset/**`（子集字体）
- 各目录的 `.gitkeep`（代码仓用来占位空目录的自有文件）

### 一并清除的缓存

`content.lock.json`、`node_modules/.astro/data-store.json`（Astro 内容层缓存）、`.astro/collections/`、
`node_modules/.cache/shirone/`（配置校验缓存与「上次校验通过」摘要）、以及 `.content-src/`
工作副本。不清 Astro 内容层缓存的话，`astro dev` 会拿旧的 content collection 快照继续渲染已删除的文章。

清理后会重新生成离线图标集合与说说缩略图：两者都是内容的派生产物，不重算会留下图标空白
或指向已删除图片的缩略图。

### 安全机制

1. **默认预演**：不加 `--yes` 只打印计划，包括待还原/待删除清单、备份体积与将被清除的缓存；
2. **快照备份**：删除或还原前把受影响文件复制到 `.content-backup/clean-<timestamp>/`（已 gitignore），
   附 `manifest.json` 记录 HEAD、清理范围、统计与还原命令。中文路径同样完整备份
   （内部统一用 `core.quotepath=false` + `-z` 读取路径，否则非 ASCII 路径会因八进制转义在备份阶段漏掉、
   却照样被删除）；
3. **失败即熔断**：任何步骤出错立即中止，并明确区分「未产生破坏性改动」与「已产生部分改动」；
4. **收尾体检**：提示内容源是否仍然生效（否则下次 `pnpm dev` 会立刻重新物化）、挂载点是否已不被跟踪
   （eject 之后无法靠清理还原出 demo 内容）、以及是否有被占用而未删掉的残留。

还原备份：

```powershell
Copy-Item -Recurse -Force .\.content-backup\clean-<timestamp>\* .
```

---

## 双仓 CI 接线

```text
内容仓 push
   │  paths 过滤（content/ data/ assets/ public/）
   ▼
trigger-build.yml ──repository_dispatch: content-updated（client_payload.sha）──▶ 代码仓 deploy.yml
                                                                                    │
                                                              checkout 代码 + 按 SHA checkout 内容
                                                                                    ▼
                                                            content:sync ──▶ pnpm build ──▶ 部署
```

### 代码仓

- `.github/workflows/deploy.yml.example`：复制为 `deploy.yml` 并替换最后的部署步骤。
  文件名不以 `.yml` 结尾，因此示例本身不会被 Actions 执行。
- `.github/workflows/content-validate.yml`：`workflow_call` 可复用流程，供内容仓在 PR 阶段调用。
- 现有 `ci.yml` 不受影响。

`deploy.yml` 的三个要点：

1. **按 SHA 取内容**。`client_payload.sha` 保证构建的就是触发它的那次提交，而不是构建时刻的 `main`；
   `workflow_dispatch` 的 `content_ref` 输入则用于回滚。
2. **`content:sync` 独立成步**。`fonts:subset` 依赖 `scripts/fonts/text-collector.mjs`
   扫描内容与配置的原始文本，内容未就位就构建会导致子集字体缺字；
   独立成步也让内容问题与构建问题在日志里天然分开。
3. **缓存 key 带内容 SHA**。说说缩略图按源图内容哈希复用，`restore-keys` 回退到上一次缓存后，
   只有新增或修改过的图片会重新生成。

### 内容仓

`pnpm content:eject` 会在导出目录里生成 `.github/workflows/trigger-build.yml` 起步文件，
补上代码仓 `OWNER/REPO` 即可使用。

### Secrets

| 仓库 | Secret | 权限 |
| --- | --- | --- |
| 内容仓 | `DISPATCH_TOKEN` | fine-grained PAT，仅对代码仓授予 Contents: Read and write |
| 代码仓 | `CONTENT_REPO_TOKEN` | fine-grained PAT，仅对内容仓授予 Contents: Read（内容仓公开时不需要） |
| 代码仓 | `BILI_SESSDATA` | 番剧同步，可选 |
| 代码仓 | 部署凭据 | 取决于托管平台 |

fine-grained PAT 有 90 天上限，长期运行建议改用 GitHub App 配合 `actions/create-github-app-token`。

### 回滚

`content.lock.json` 与 job summary 会记录本次使用的内容 commit。回滚时用
`workflow_dispatch` 把 `content_ref` 填成旧 SHA 重跑即可，不需要在内容仓 revert 文章。

## 迁移到 `external` 模式

在**自己的 fork** 中执行，上游主题仓不做这一步：

```powershell
pnpm content:eject                       # 预演，只打印将要发生的改动
pnpm content:eject --yes                 # 实际执行，默认导出到 ../shirone-content
pnpm content:eject --yes --out ..\my-content
```

`--yes` 会做四件事：

1. 把用户内容按内容仓布局导出到目标目录，并生成 `README.md`、`.gitignore`、
   `config/` 起步文件与 `.github/workflows/trigger-build.yml`；
2. 把这些路径写入代码仓 `.gitignore`；
3. `git rm -r --cached` 让代码仓不再跟踪它们（**文件保留在工作区**，因此首次 `content:sync` 是空操作）；
4. 写出指向导出目录的 `shirone.content.json`。

主题自有资产（`src/assets/fonts/`、`public/favicon/`）与构建期生成物不会被导出。

`config/` 只导出**站点身份**——`site.yaml`（站点地址 / base / 标题 / 副标题 / 语言）与
`profile.yaml`（头像 / 名称 / 简介 / 社交链接），外加当前的 `footer.html`。
其余领域刻意留空：把此刻的默认值全量倒进内容仓，等于把配置冻结在这一版主题上，
日后主题新增的默认值再也进不来。需要改哪个领域，就照 `config/README.md` 新建对应的 YAML。

执行前要求工作区干净；导出目录必须不存在或为空。两项都可以用 `--force` 跳过，但不建议。

内容仓推到远端之后，把 `shirone.content.json` 的 `source` 改成：

```json
{ "type": "git", "url": "https://github.com/OWNER/shirone-content.git", "ref": "main" }
```

## 边界与已知限制

- **配置覆盖不容忍未知键。** 内容仓写下主题不认识的键会让同步失败，而不是被忽略。
  这是刻意的：静默忽略意味着「我明明配了却没生效」，排查成本远高于一次明确的构建失败。
  主题重命名配置键时，内容仓需要跟着改——错误信息里会给出 `Did you mean ...?`。
- **`data/*.ts` 与代码仓类型耦合。** 内容仓的数据文件会 `import type { ProjectItem } from "@/types/projectsConfig"`。
  主题升级若改动这些类型，内容仓会构建失败——这是有意接受的取舍，失败明确且由 `astro check` 捕获。
- **`frontmatter.json`（Front Matter CMS）仍指向 `src/content/posts`。** 在 `external` 模式下
  那是物化产物，在其中编辑会被下一次 `content:sync` 覆盖。请在内容仓中编辑；
  已经写在物化目录里的改动可以用 `pnpm content:export` 先救回内容仓，再由 sync 正常物化回来。
- **`content:watch` 只支持 `type: "path"`。** 远端内容仓没有本地文件可监听。
- **`@[code-tree](<dir>)` 的目录必须落在代码仓工作区内。** `src/plugins/markdown/code/remark-code-tree.mjs`
  的 `scanLocalDirectory()` 以代码仓根目录为基准解析路径，并拒绝逃出根目录的路径（解析后返回空清单）。
  在 `external` 模式下，内容仓的目录要先被物化才可见，因此引用的目录只能写物化后的路径
  （如 `src/content/posts/<slug>/snippets`、`src/data/...`），不能指向内容仓自己的目录结构
  （`content/posts/...`）。其余 Markdown 扩展（admonitions、collapse-panels、steps、markers、
  abbreviations、content-annotations、option-groups）只在 AST 与客户端脚本层工作，不读文件系统，
  物化后天然兼容，无需任何适配。
- **内容仓体积**会随图片增长。暂不引入 Git LFS（会同时复杂化 `actions/checkout`
  与部分平台的 Git 集成），到百 MB 量级再评估。

## 验收

```powershell
pnpm content:validate           # 结构、冲突与配置类型
pnpm content:status             # 离线检查连接、锁与物化新旧状态
pnpm content:status --remote    # 额外检查远端仓库/ref（会联网）
pnpm content:export             # 预演反向导出计划（不修改文件）
pnpm content:clean              # 预演清理计划（不修改文件）
node --test tests/content-*.test.mjs
npx.cmd astro check             # 0 error 0 warning
pnpm build                      # 完整构建
```

`local` 模式下的回归验收标准是：`pnpm content:sync` 无任何输出，且 `git status` 干净。

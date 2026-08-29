---
name: shirone-content
description: Managing Shirone content separation and dual-repository workflows - sourcing content from a separate Git repo or local directory, YAML configuration overlays, CLI commands (sync, status, export, clean, eject, watch, validate), safe backups, reverse-export diffing, and dual-repo CI/CD deployment. Use when configuring CONTENT_DIR or CONTENT_REPO_URL, migrating a fork to external mode, writing config overlay YAML in the content repo, syncing or exporting content between the two repos, resetting the workspace to the theme demo state, or wiring repository_dispatch builds.
---

# Shirone 内容分离与双仓运维

权威规范是 `docs/content-separation/README.md`(必须先全量阅读),详细子模块见 `docs/content-separation/config-overlay.md`、`docs/content-separation/cli-workflows.md` 与 `docs/content-separation/dual-repo-ci.md`,静态资源目录边界见 `docs/asset-pipeline.md`,配置契约见 `src/config/README.md`。本技能只做入口收敛,不复制上述文档的细节。

## 两种模式

- `local`(默认):未配置内容源。`pnpm content:sync` 是完全静默的空操作,`git status` 保持干净。上游主题仓与普通 clone 用户始终处于此模式。
- `external`:配置了内容源(环境变量 / 根目录 `.env` / `shirone.content.json`)。内容来自独立内容仓,构建前由 `content:sync` **物化**到仓内标准路径。

`SHIRONE_CONTENT_SYNC=0` 可强制回到 `local`。切到 `external` 是使用者在自己 fork 里的一次性动作(`pnpm content:eject`),不要在上游主题仓执行。

## 何时使用本技能

1. 配置内容源或切换模式:`CONTENT_DIR`、`CONTENT_REPO_URL`、`CONTENT_REPO_REF`、`shirone.content.json`(示例 `shirone.content.example.json`),或执行 `pnpm content:eject` 迁出双仓;
2. 日常同步与写作:`pnpm content:sync`(已并入 `dev`/`build` 首位)、`pnpm content:watch`(仅 `type: "path"`)、`pnpm content:status`(离线诊断,`--remote` 才联网);
3. 维护内容仓 `config/` 下 22 个领域的 YAML 覆盖,或排查其类型校验报错;
4. 反向导出:把工作区里误写或调好的文章、图片、配置改动回写内容仓(`pnpm content:export`);
5. 工作区重置:清理物化内容与生成物,回到主题自带 Demo 态(`pnpm content:clean`);
6. 双仓 GitHub Actions 自动化构建部署与排错(`.github/workflows/deploy.yml.example`、`.github/workflows/content-validate.yml`)。

## CLI 核心工具链

`scripts/content/cli.mjs` 是统一分发器,冒号式与空格子命令等价(`pnpm content:status` = `pnpm content status`)。

| 命令 | 方向与作用 | 实现 |
|---|---|---|
| `content:sync` | 内容仓 → 代码仓,增量物化并写出 `content.lock.json` | `scripts/content/sync.mjs` |
| `content:validate` | 安全预检：零写盘预检结构、冲突与配置类型 | `scripts/content/sync.mjs` |
| `content:watch` | 实时同步：后台监听本地内容目录并自动增量物化 | `scripts/content/sync.mjs` |
| `content:status` | 状态体检：只读检测内容源、文件资源、配置语法与同步状态 | `scripts/content/status.mjs` |
| `content:export` | 反向导出：代码仓 → 内容仓，反向写回新建或修改的文章与配置 | `scripts/content/export.mjs` |
| `content:clean` | 重置还原：代码仓 → 主题初始 Demo 态，安全清理已同步文章与配置 | `scripts/content/clean.mjs` |
| `content:eject` | 一键解耦：单仓转双仓，一键初始化独立的外部内容仓库 | `scripts/content/eject.mjs` |

`export`、`clean`、`eject` **默认只预演**,加 `--yes` 才执行,`--dry-run` 优先级更高;三者都会先写快照备份(`.export-backup/` 与 `.content-backup/`)。

## 必须守住的红线

**物化不可绕过。** 静态 `import.meta.glob`、`astro.config.mjs` 的同步 import、文章相对图片引用三条硬约束决定了用户内容必须物理落在 `src/` 与 `public/` 下。目录映射:`content/` → `src/content/`、`data/` → `src/data/`、`assets/` → `src/assets/`(参与构建期优化)、`public/` → `public/`(原样);`config/` 是唯一不走目录拷贝的入口,编译成 `src/user/user-config.ts`,`footer.html` → `src/config/FooterConfig.html`。

**生成物不手改。** `src/user/user-config.ts` 由 sync 写出;`local` 模式下它与仓库已提交版本逐字节相同。它放在 `src/user/` 是为了让图标扫描与 `scripts/fonts/text-collector.mjs` 的字形收集覆盖到用户配置文本,不要迁走。

**覆盖层只写想改的键。** 合并规则是对象递归合并、数组整体替换(数组语义是「这就是我要的全部条目」)。未声明的键继承主题升级后的新默认值,因此禁止把整份配置快照倒进内容仓。可用键与默认值以代码仓 `src/config/` 各配置文件的注释为准,类型真源是 `src/types/config.ts` 等类型模块;校验走只含生成物的内存 TypeScript 编译,未知键会失败而非被忽略。领域键与 YAML 文件名按驼峰↔kebab-case 对应(`postList` ↔ `post-list.yaml`)。

**新增可外置的配置领域要登记。** 除了在 `src/config/index.ts` 注册 barrel 并用 `withUserConfig()` 包住默认值,还必须在 `scripts/content/config-domains.mjs` 补一行(领域名、YAML 文件名、类型),它同时驱动生成、校验与 eject 起步文件;`tests/content/content-config.test.mjs` 会检查文件名唯一且为 kebab-case。流程见 `src/config/README.md`。

**`nav-bar.yaml` 是唯一例外。** 它是声明式子集(`preset`、`$t:` 前缀),整体替换默认导航,不走深合并,且**不可反向导出**(`i18n()` 与 `LinkPresets` 解析有损),只能手工维护。可用预设见 `src/config/navBarConfig.ts`。

**裁剪只在内容仓确实拥有的顶层段内发生。** 内容仓没有 `content/spec/` 时,代码仓 `src/content/spec/` 原样保留。导出方向与此对称。

**受保护路径既不裁剪也不接受覆盖**(内容仓提供同名文件会直接报错):说说缩略图、番剧封面与快照、子集字体产物,以及各目录 `.gitkeep` 与 `shirone.content.json` 的 `keep` 白名单。清单见 `docs/content-separation/README.md` 的「构建期生成物豁免」与 `docs/content-separation/cli-workflows.md` 的「豁免路径」两节。根本原因是 `docs/asset-pipeline.md` 的目录职责划分:`src/assets/` 与 `public/images/` 提交原始文件、归内容仓,`public/assets/` 下按业务域归档的是可重复生成的派生产物、只保留 `.gitkeep`——派生物进内容仓会与生成器互相覆盖。clean 之后会重新生成离线图标集合与说说缩略图。

**导出是向另一个 git 仓库写入。** 拒绝 `local` 模式、`CI=true` 与 `type: "git"` 的浅工作副本;要求内容仓工作区干净且物化状态与内容仓 `config/` 现状一致(否则会把过期值写回去);默认绝不删除,`--prune` / `--prune-config` 才允许,且删除前必然备份。它不改代码仓的 `.gitignore`、git 索引与 `shirone.content.json`,也不替你 commit。它回写的是覆盖层,不会把 `src/config/` 里的本地默认值改动提升成覆盖。

**清理只覆盖挂载目标 + 配置生成物。** 主题源码里的未提交改动不在范围内——这是它与 `git checkout -- src/` 的根本区别;挂载点被配成过宽目录时直接拒绝执行。eject 之后物化内容已被 gitignore,清理走 `git ls-files --others --ignored` 而非 `git status`。它会把 `src/user/user-config.ts` 重置成空覆盖层,**直接改在那份生成物里的配置会丢失**,先跑 `pnpm content:export --config` 把它固化成 YAML 再清理。

**自定义 `mounts` 有边界。** 源与目标都必须是仓库内的相对目录,不含 `..`,不读 `.git/`、`node_modules/`,不写 `scripts/`、`tests/` 等保留目录;多个挂载不得相同或互为父子。内容仓出现未声明的顶层目录时 sync 只告警不同步,要同步就在 `shirone.content.json` 的 `mounts` 里声明。

**环境变量优先级**:进程环境变量 > `.env.local` > `.env` > `shirone.content.json` > `local` 默认值;空字符串等同未设置。`CONTENT_SYNC_PULL=false` 只复用已存在且身份完全一致的 `.content-src/`,不隐式 fetch。**内容仓禁止存放密钥**,凭据继续走 GitHub Secrets。

**Markdown 相对引用的唯一限制**:`@[code-tree]` 的目录由 `src/plugins/markdown/code/remark-code-tree.mjs` 以代码仓根目录为基准解析,`external` 模式下必须填物化后的路径(如 `src/content/posts/<slug>/snippets`),不能指向内容仓布局。其余 16 种自定义语法只在 AST 与客户端层工作,物化后天然兼容。

**双仓 CI 三要点**:按 `client_payload.sha` 检出内容避免并发错版;`content:sync` 独立成步且置于 `fonts:subset` 之前(否则子集字体缺字);缩略图缓存 key 绑定内容 SHA。Secrets 为内容仓 `DISPATCH_TOKEN` 与代码仓 `CONTENT_REPO_TOKEN`,回滚用 `workflow_dispatch` 填旧 SHA 重跑。

## 阅读顺序

1. `docs/content-separation/README.md` — 模式、物化规则、目录契约、已知限制(权威总纲)
2. `docs/content-separation/config-overlay.md` — 配置覆盖机制与 22 个领域的 YAML 映射契约
3. `docs/content-separation/cli-workflows.md` — CLI 工具链与核心工作流
4. `docs/content-separation/dual-repo-ci.md` — 双仓自动化构建部署与迁移指南
5. `src/config/README.md` — 各配置领域的契约、默认值与 config/data 判别
6. `docs/asset-pipeline.md` — `src/assets/` 与 `public/` 的分工与构建期优化边界
7. `scripts/content/` 下对应脚本 — 需要核实具体行为时读实现,不靠推测
8. `shirone.content.example.json` — 清单字段(`schemaVersion`、`source`、`mounts`、`keep`、`prune`)

## 验证

```powershell
pnpm content:validate            # 安全预检：零写盘检查结构冲突与配置类型
pnpm content:status              # 状态体检：检查内容源连接、配置语法与同步状态
pnpm content:status --remote     # 额外检查远端仓库/ref（会联网）
pnpm content:export              # 预演反向导出计划(不写文件)
pnpm content:clean               # 预演重置还原计划(不写文件)
node --test tests/content/*.test.mjs
npx.cmd astro check              # 0 error 0 warning
```

对应测试:`tests/content/content-sync.test.mjs`、`tests/content/content-export.test.mjs`、`tests/content/content-clean.test.mjs`、`tests/content/content-eject.test.mjs`、`tests/content/content-status.test.mjs`、`tests/content/content-config.test.mjs`、`tests/content/content-cli.test.mjs`。

`local` 模式的回归标准:`pnpm content:sync` 无任何输出,且 `git status` 干净。修改本技能后运行 `pnpm.cmd check:manifest`。

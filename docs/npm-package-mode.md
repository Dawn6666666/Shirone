# Shirone as an npm package

Shirone runs in two modes from a single source tree:

| Mode | How you get it | Best for |
| --- | --- | --- |
| **Source template** | `git clone` this repository | deep customisation, theme development |
| **npm package** | `pnpm add shirones` | spinning up a blog, easy upgrades |

Both modes execute the same `src/`. The npm mode is implemented by
`src/integration/`, which is inert when you use the repository directly.

## How the two modes coexist

`src/integration/index.ts` detects its own location:

```ts
const isPluginMode = import.meta.url.includes("/node_modules/");
```

- **Source mode** — `astro.config.mjs` in this repository drives everything and
  Astro's file-based routing picks up `src/pages/` directly. The integration is
  not referenced at all.
- **Package mode** — the user's `astro.config.mjs` contains only
  `integrations: [shirones()]`. The integration then reproduces everything the
  repository's `astro.config.mjs` does: it registers the bundled integrations,
  builds the font declarations, installs the markdown processor, and injects
  every page in `src/pages/` with `injectRoute`.

## Architecture

```text
src/integration/
├── index.ts        integration entry — the package-mode equivalent of astro.config.mjs
├── overlay.ts      override system (Vite resolveId)
├── load-config.ts  Node-side loader for user TypeScript config
├── routes.ts       src/pages scan → injectRoute patterns
├── fonts.ts        font declarations + plugin-mode subsetting
├── collections.ts  defineCollections() for src/content.config.ts
├── cli.mjs         `shirones init`
├── paths.ts        directory resolution
└── types.ts        public option types
```

## The override system

This is the piece worth understanding. Users override theme internals by
mirroring the package structure in their own project:

| Package file | User file that wins |
| --- | --- |
| `src/config/siteConfig.ts` | `shirones/config/siteConfig.ts` |
| `src/data/friends.ts` | `shirones/config/data/friends.ts` |
| `src/components/atoms/blog/PostCard.astro` | `src/components/atoms/blog/PostCard.astro` |
| `src/layouts/Layout.astro` | `src/layouts/Layout.astro` |

`overlay.ts` implements this as a `pre` Vite plugin that reacts to exactly two
specifier shapes:

1. **Theme aliases** — `@/config/siteConfig`, `@components/...`, `@utils/...`
2. **Relative imports whose importer lives inside the package** — e.g.
   `../data/music.ts` from `src/config/musicConfig.ts`

Anything else returns `null`, leaving Vite's resolution untouched.

> **Why not resolve everything and inspect the result?**
> An earlier version routed every specifier through `this.resolve()` so it could
> examine the final path. That also intercepted bare package specifiers such as
> `shirones/collections` and broke them — content collection types failed to
> generate. Reacting only to shapes that can reference theme internals is both
> correct and considerably faster.

Since config values are also needed in Node *before* Vite exists (the site URL,
font declarations, expressive-code themes), `load-config.ts` applies the same
override rules through an esbuild plugin and imports the bundled result.

## Path rewriting in the template

Config modules move from `src/config/` to `shirones/config/`, so their relative
imports have to change. `prepare-templates.mjs` in the pipeline repository does
this mechanically:

| Upstream | Template |
| --- | --- |
| `../data/music.ts` | `./data/music.ts` |
| `../types/fontConfig.ts` | `@/types/fontConfig.ts` |
| `../utils/font-options.ts` | `@/utils/font-options.ts` |
| `./siteConfig` | unchanged (still a sibling) |

`src/config/index.ts` stays package-owned: it is the barrel every consumer
imports from, so letting users shadow it would break the export contract.

## Fonts

Source mode writes subsets to `src/assets/fonts/.subset/`. That path is inside
`node_modules` once installed, so package mode writes to
`<project>/.shirones/fonts/` instead and hands Astro absolute paths. Subsets are
cached against a hash of the collected charset, so repeat builds skip the work.

## Things to keep in sync

- `routes.ts` and the pipeline's `generate-manifest.mjs` both derive route
  patterns from filenames. Change one, change the other.
- Anything imported by a page must be in `dependencies`, never
  `devDependencies` — the package build fails the release if it finds an
  undeclared bare import. `@iconify-json/simple-icons` was exactly this trap.

## Publishing

Building and publishing live in
[`yCENzh/shirones`](https://github.com/yCENzh/shirones). That repository clones
this one, transforms the source, and publishes. No theme code lives there.

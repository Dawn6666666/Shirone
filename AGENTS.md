# Agent Instructions for Shirone — M3E Blog Theme

## Summary

Shirone is a blog theme built with Astro 7 + Svelte 5 (runes) + Tailwind 4 + Stylus + pnpm, forked from Fuwari and refactored into an M3E (Material 3 Extended) atom component library with data-driven orchestration. In-site navigation uses Swup (SPA-style). Development happens on Windows; always use the `.cmd` suffix for commands (`pnpm.cmd` / `npx.cmd`).

## Must-follow rules

- Run `npx.cmd astro check` before committing — must be 0 errors. Split commits by feature stage with conventional prefixes (`feat/fix/style/docs/chore(scope)`).
- Never hard-code component copy: use i18n (`src/i18n/i18nKey.ts` + `languages/` ×10 locales; parameterized strings use `{xxx}` placeholders replaced by the consumer).
- Colors / radii / durations / typography must use design tokens (`--shape-corner-*`, `--m3e-type-*`, `--m3e-duration-*`, `--m3e-easing-*`, `--surface-container-*`); no hard-coded values (exception: fixed black/white overlays on images).
- Layering rules: atoms must not import components (tokens only); molecules must not import organisms; data fetching / localStorage belongs to organisms only. See `docs/atomic-structure.md`.
- Svelte components in Astro: pure SSR has no interactivity; add `client:load` / `client:only="svelte"` for interactivity. On pure SSR pages (no hydration), icons must use astro-icon (`@iconify/svelte` renders empty in SSR).
- Svelte style classes: use template-literal class (`class={`...${cond ? " x" : ""}`}`) and stylus `&`-joined selectors (`&--mod`); literal class-name selectors get stripped by unused-CSS analysis, and nesting `&__el` inside `&--mod` merges into a single class name.
- Keep designs original and differentiated: do not copy schemas / names / defaults from the reference themes in `research/`.
- Run the relevant fragment after changes (`tests/site/*.spec.ts`); `a11y.spec.ts` is the default safety net after page/component changes.

## Must-read documents

- `rules/pitfalls.md` — pitfall log (required: Svelte/Astro integration, stylus, dev cache, testing)
- `rules/project-rules.md` — project rules
- `docs/atomic-structure.md` — component layering spec
- `docs/m3e-standard.md` — M3E component standard
- `docs/sidebar-system.md` — sidebar orchestration / page filtering / Swup sync

## Agent guidelines

- Common commands: `pnpm.cmd astro dev --port 4321` (dev), `npx.cmd astro check` (type gate), `npx.cmd playwright test tests/site/<spec>.spec.ts` (fragment tests), `pnpm.cmd build` (production build).
- Stylus / Svelte style hot-reload is unreliable in dev: if changes don't apply, clear `node_modules/.vite` + `.astro` and restart the dev server (pitfalls 6.4).
- rehype/remark plugin changes don't hot-reload: clear `.astro/data-store.json` and restart (pitfalls 4.1).
- Wait for onload-animation convergence and theme init (`--mc-primary` written) before asserting styles in tests (pitfalls 5.1).
- The sidebar / top bar render statically outside the Swup container and are not re-rendered after navigation — logic that must react to page changes should hook `content:replace` or use event delegation.

## Context

- The sidebar is data-driven: `src/config/sidebarConfig.ts` (discriminated union) → `componentMap` registry in `SideBar.astro` → `WidgetLayout` rendering; the widget `pages` tag filters by `data-current-page` on `#swup-container` (SSR + client share `utils/sidebar-page.ts`).
- Motion primitives live in `utils/motion.ts` (fadeOutThenHide / flipFromRect / revealIn / collapse); reduced-motion always snaps.
- Category/tag index pages exist (`src/pages/categories.astro`, `tags.astro`); `SidebarPage` already includes `"categories" | "tags"`.
- 60+ M3E atoms are ported under `src/components/atoms/`; unused atoms and landing evaluations are covered in `docs/sidebar-widgets.md` and `docs/common-components.md`.

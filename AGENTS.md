# Branch Notes

- Hide homepage creation entries `原型`、`幻灯片`、`模板`、`其他` in this branch.
- Keep `店铺首页` as the only visible new-project entry, and keep that exact Chinese label. The canonical internal identifier is `shopHomePage`; treat `storefront` as legacy compatibility only.
- Force the UI language to Simplified Chinese (`zh-CN`) for this branch.
- Do not expose any visible language-switching UI, including the settings dialog and entry-page language menu, unless the user explicitly asks for it.

## ShopHomePage Direction

- Treat `店铺首页` as a dedicated storefront workflow, not just another generic homepage/prototype mode.
- Storefront-facing wording and requirement guidance should stay aligned with the shop scene; prefer storefront-native expressions instead of generic design-language phrasing.
- In the storefront homepage flow, `banner` and `商品` are optional by default. Keep that behavior consistent through the full path, and do not silently add them back as mandatory requirements.
- In the storefront homepage flow, `banner` should not add default padding; only add padding when the user explicitly asks for it.
- In the storefront homepage flow, `user_assets` must use the B-end actual card layout modes and preserve slot-driven aspect ratios.
- In the storefront homepage flow, the default 3-entry layout is `一行三个`; only use `左一右二` when the confirmed request text explicitly implies `左一右二 / 一大两小 / 主次入口`, while existing legacy `left/right_top/right_bottom` projects remain compatible.
- In the storefront homepage flow, `hotzone` is only for more than 5 entries or explicit hotzone/freeform requests, and fixed layouts generate cards sequentially with the first card used as the reference image for later cards.
- In the storefront homepage flow, if the opening turn already contains local reference images, let the current daemon agent analyze them in the first clarification turn and use that result to prefill ordered `module_specs`; unmatched reference blocks should fall back to repeatable `image_ad` modules with ratio hints.
- In the storefront homepage flow, image-bearing modules should keep project-local `reference_images` so downstream asset generation can use real input images instead of text-only prompts.
- In the storefront homepage flow, full-page screenshot `reference_images` are module-scoped: only modules visibly represented by the current frame, or modules with explicit module-local refs, should inherit them; absent modules such as `shop_info` must not inherit a screenshot just for style.
- In the storefront homepage flow, when a full-page reference screenshot visibly contains `user_assets`, schema generation must copy that local filename into each `user_assets.entries[*].reference_images` by default; those refs only borrow the visible entry-card icon stroke, composition, title hierarchy, and whitespace, not the membership summary, bottom tabs, or host-app UI.
- In the storefront homepage flow, do not rely on auto-cropped module reference files. Use the full reference screenshot in `reference_images`, then constrain `top_slider` to only borrow hero atmosphere/composition and constrain `user_assets` to only borrow the visible icon-area style language while generating each button subject and copy from the confirmed requirements.
- In the storefront homepage flow, full-page reference screenshots also constrain composition, whitespace, information density, text amount, and title scale; do not reduce them to color/style inspiration only.
- In the storefront homepage flow, image generation with reference images must first analyze the screenshot as components, then borrow only the component relevant to the asset being generated; keep reference-led prompt JSON lightweight and avoid conflicting visual descriptors.
- In the storefront homepage flow, full-page reference screenshots only confirm modules visible in the current frame; do not infer off-screen modules, and downstream image generation must explicitly distinguish reusable style cues from UI elements that should be ignored.
- In the storefront homepage flow, image asset generation must reuse the daemon OpenAI credential resolution path so Settings, env vars, and OpenAI OAuth behave consistently.
- In the storefront homepage flow, image asset generation defaults to `gpt-image-2`; existing projects without stored `imageModel` metadata fall back there at runtime.
- In the storefront homepage flow, model-generated image assets default to straight edges and zero inner padding; do not ask the model for rounded card shells or extra white margins unless the user explicitly asks for them.
- In the storefront homepage preview, pending image placeholders should fully fill their module bounds and keep the waiting mark visually centered instead of leaving trailing blank space.
- In the storefront homepage preview contract, `storefront.screen.html` is inner content only; system status UI and phone chrome belong to the outer preview/debug hosts.
- When `shopHomePage` behavior changes on this branch, update this file in the same change with the new high-level direction. Keep the notes behavioral and concise; do not turn `AGENTS.md` into an implementation log.

# Directory Guide

This file is the single source of truth for agents entering this repository. Read this file first; after entering `apps/`, `packages/`, or `tools/`, read that layer's `AGENTS.md` for module-level details. Do not copy module details back into the root file; root stays focused on cross-repository boundaries, workflow, and commands.

## Core Documentation Index

- Product and onboarding: `README.md`, `README.zh-CN.md`, `QUICKSTART.md`.
- Contribution and environment: `CONTRIBUTING.md`, `CONTRIBUTING.zh-CN.md`.
- Architecture and protocols: `docs/spec.md`, `docs/architecture.md`, `docs/skills-protocol.md`, `docs/agent-adapters.md`, `docs/modes.md`.
- Roadmap and references: `docs/roadmap.md`, `docs/references.md`, `specs/current/maintainability-roadmap.md`.
- Directory-level agent guidance: `apps/AGENTS.md`, `packages/AGENTS.md`, `tools/AGENTS.md`.

## Workspace Directories

- Workspace packages come from `pnpm-workspace.yaml`: `apps/*`, `packages/*`, `tools/*`, and `e2e`.
- Top-level content directories: `skills/` (artifact-shape skills), `design-systems/` (brand `DESIGN.md` files), `craft/` (brand-agnostic craft rules a skill can opt into via `od.craft.requires`).
- `apps/web` is the Next.js 16 App Router + React 18 web runtime; do not restore `apps/nextjs`.
- `apps/daemon` is the local privileged daemon and `od` bin. It owns `/api/*`, agent spawning, skills, design systems, artifacts, and static serving.
- `apps/desktop` is the Electron shell; it discovers the web URL through sidecar IPC.
- `apps/packaged` is the thin packaged Electron runtime entry; it starts packaged sidecars and owns the `od://` entry glue only.
- `packages/contracts` is the pure TypeScript web/daemon app contract layer.
- `packages/sidecar-proto` owns the Open Design sidecar business protocol; `packages/sidecar` owns the generic sidecar runtime; `packages/platform` owns generic OS process primitives.
- `tools/dev` is the local development lifecycle control plane.
- `tools/pack` is the local packaged build/start/stop/logs control plane and mac beta release artifact preparation surface.
- `e2e` contains Playwright UI specs and Vitest/jsdom integration tests.

## Inactive Or Placeholder Directories

- `apps/nextjs` and `packages/shared` have been removed; do not recreate or reference them.
- `.od/`, `.tmp/`, `e2e/.od-data`, Playwright reports, and agent scratch directories are local runtime data and must stay out of git.

# Development Workflow

## Environment Baseline

- Runtime target is Node `~24` and `pnpm@10.33.2`; use Corepack so the pnpm version pinned in `package.json` is selected.
- New project-owned entrypoints, modules, scripts, tests, reporters, and configs should default to TypeScript.
- Residual JavaScript is limited to generated output, vendored dependencies, explicitly documented compatibility build artifacts, and the allowlist in `scripts/check-residual-js.ts`.

## Local Lifecycle

- Use `pnpm tools-dev` as the only local development lifecycle entry point.
- Do not add or restore root lifecycle aliases: `pnpm dev`, `pnpm dev:all`, `pnpm daemon`, `pnpm preview`, or `pnpm start`.
- Ports are governed by `tools-dev` flags: `--daemon-port` and `--web-port`.
- `tools-dev` exports `OD_PORT` for the web proxy target and `OD_WEB_PORT` for the web listener; do not use `NEXT_PORT`.

## Boundary Constraints

- Keep shared API DTOs, SSE event unions, error shapes, task shapes, and example payloads in `packages/contracts`; update contracts before wiring divergent web/daemon request or response shapes.
- Keep `packages/contracts` pure TypeScript and free of Next.js, Express, Node filesystem/process APIs, browser APIs, SQLite, daemon internals, and sidecar control-plane dependencies.
- Keep project-owned entrypoints, modules, scripts, tests, reporters, and configs TypeScript-first; generated `dist/*.js` is runtime output, and source edits belong in `.ts` files.
- New `.js`, `.mjs`, or `.cjs` files need an explicit generated/vendor/compatibility reason and must pass `pnpm check:residual-js`.
- App business logic must not know about sidecar/control-plane concepts. Keep sidecar awareness in `apps/<app>/sidecar` or the desktop sidecar entry wrapper.
- Shared web/daemon app contracts belong in `packages/contracts`; that package must not depend on Next.js, Express, Node filesystem/process APIs, browser APIs, SQLite, daemon internals, or the sidecar control-plane protocol.
- Sidecar process stamps must have exactly five fields: `app`, `mode`, `namespace`, `ipc`, and `source`.
- Orchestration layers (`tools-dev`, `tools-pack`, packaged launchers) must call package primitives; do not hand-build `--od-stamp-*` args or process-scan regexes.
- Packaged runtime paths must be namespace-scoped and independent from daemon/web ports; ports are transient transport details only.
- Default runtime files live under `<project-root>/.tmp/<source>/<namespace>/...`; POSIX IPC sockets are fixed at `/tmp/open-design/ipc/<namespace>/<app>.sock`.

## Git Commit Policy

- Git commits must not include `Co-authored-by` trailers or any other co-author metadata.

## Validation Strategy

- After package, workspace, or command-entry changes, run `pnpm install` so workspace links and generated dist entries stay fresh.
- Before marking regular work ready, run at least `pnpm typecheck` and `pnpm test`; run `pnpm build` as well when build boundaries are involved.
- For the web/e2e loop, prefer `pnpm tools-dev run web --daemon-port <port> --web-port <port>`.
- On a GUI-capable machine, validate desktop by running `pnpm tools-dev`, then `pnpm tools-dev inspect desktop status`.
- Stamp/namespace changes must validate two concurrent namespaces and run desktop `inspect eval` plus `inspect screenshot` for each namespace.
- Path/log changes must run `pnpm tools-dev logs --namespace <name> --json` and confirm log paths are under `.tmp/tools-dev/<namespace>/...`.

# Common Commands

```bash
pnpm install
pnpm tools-dev
pnpm tools-dev start web
pnpm tools-dev run web --daemon-port 17456 --web-port 17573
pnpm tools-dev status --json
pnpm tools-dev logs --json
pnpm tools-dev inspect desktop status --json
pnpm tools-dev inspect desktop screenshot --path /tmp/open-design.png
pnpm tools-dev stop
pnpm tools-dev check
```

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm test:ui
pnpm test:ui:headed
pnpm test:e2e:live
pnpm check:residual-js
```

```bash
pnpm --filter @open-design/web typecheck
pnpm --filter @open-design/web test
pnpm --filter @open-design/daemon typecheck
pnpm --filter @open-design/daemon test
pnpm --filter @open-design/daemon build
pnpm --filter @open-design/desktop build
pnpm --filter @open-design/tools-dev build
pnpm --filter @open-design/tools-pack build
pnpm -r --if-present run typecheck
pnpm -r --if-present run test
```

```bash
pnpm tools-pack mac build --to all
pnpm tools-pack mac install
pnpm tools-pack mac cleanup
pnpm tools-pack win build --to nsis
pnpm tools-pack win install
pnpm tools-pack win cleanup
pnpm tools-pack linux build --to appimage
pnpm tools-pack linux install
pnpm tools-pack linux build --containerized
```

# FAQ

## Why Is There No Root `pnpm dev` / `pnpm start`?

To avoid starting daemon, web, and desktop through inconsistent env, port, namespace, or log paths. All local lifecycle flows must go through `pnpm tools-dev`.

## Why Should `apps/nextjs` Not Be Restored?

The current web runtime is `apps/web`. The historical `apps/nextjs` layout has been removed from the active repo shape; restoring it would reintroduce duplicate app boundaries and stale scripts.

## How Does Desktop Discover The Web URL?

Desktop queries runtime status through sidecar IPC. The web URL comes from `tools-dev` launch status, not from desktop guessing ports or reading web internals.

## How Are sidecar-proto, sidecar, And platform Split?

`@open-design/sidecar-proto` owns Open Design app/mode/source constants, namespace validation, stamp fields/flags, IPC message schema, status shapes, and error semantics. `@open-design/sidecar` provides only generic bootstrap, IPC transport, path/runtime resolution, launch env, and JSON runtime files. `@open-design/platform` provides only generic OS process stamp serialization, command parsing, and process matching/search primitives, consuming the proto descriptor.

## Where Is Data Written?

The daemon writes `.od/` by default: SQLite at `.od/app.sqlite`, agent CWDs under `.od/projects/<id>/`, saved renders under `.od/artifacts/`, and credentials at `.od/media-config.json`. Two env vars override the storage root, in order:

1. `OD_DATA_DIR=<dir>` relocates all daemon runtime data to `<dir>`.
2. `OD_MEDIA_CONFIG_DIR=<dir>` relocates only `media-config.json`.

Default precedence is `OD_MEDIA_CONFIG_DIR > OD_DATA_DIR > <projectRoot>/.od`.

## When Is `pnpm install` Required?

Run `pnpm install` after changing package manifests, workspace layout, command entrypoints, bin/link-related content, or after adding/removing workspace packages.

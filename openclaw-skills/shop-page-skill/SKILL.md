---
name: shop-page-skill
description: |
  Drive Open Design `店铺首页` creation from an external chat client such as
  OpenClaw. Use this when a caller wants to create or continue a real
  `shopHomePage` project entirely through chat: create the project, receive
  Markdown-rendered requirement clarification, submit the user's answers back
  to the same conversation, auto-complete visual clarification, generate schema,
  enqueue assets, and return the real preview URL.
triggers:
  - "open design storefront control"
  - "shop homepage controller"
  - "店铺首页外部调用"
  - "店铺首页自动化"
  - "店铺首页控制"
od:
  mode: shopHomePage
  scenario: marketing
  preview:
    type: shopHomePage
    entry: shop-home-page.preview.html
  design_system:
    requires: false
  example_prompt: "帮我的面包店生成一个首页"
---

# Open Design Shop Home Page Control

This skill is an OpenClaw chat adapter for the existing Open Design B-end
`店铺首页` workflow.

The user must be able to finish the workflow inside the external chat. Do not
ask the user to open the B-end project page to continue. A project URL may be
included only as optional debug / handoff metadata after the chat response is
already useful.

## Core Rule

Use the daemon OpenClaw proxy API as the source of truth:

- `POST /api/openclaw/shop-home-page/sessions`
- `POST /api/openclaw/shop-home-page/sessions/:projectId/messages`
- `GET /api/openclaw/shop-home-page/sessions/:projectId`

These endpoints create and update a real `shopHomePage` project, real
conversation, real messages, project-local files, schema runtime, asset queue,
and preview artifacts.

Always execute the main flow through
`openclaw-skills/shop-page-skill/scripts/od-shop-home-page.cjs`.

- Let the helper script construct the daemon API paths.
- Treat `OD_DAEMON_URL` as the only default daemon origin. If the caller cannot
  inject that env var, pass the same value explicitly with `--daemon-url`.
- Do not derive the API origin from a web page URL, preview URL, `localhost:3000`,
  `OD_PORT`, `OD_WEB_PORT`, or any other web listener.
- If no daemon origin is available, fail fast instead of guessing a localhost
  fallback port.

Do not implement a private clarification, schema generation, asset generation,
or preview state machine inside the skill.

## Chat Flow

1. For a fresh user brief, call `sessions` with `brief` and any attachments.
2. Return the API's `replyMarkdown` directly to the user.
   - If `replyType = requirements_form`, this Markdown is the human-readable
     mirror of the real B-end `<question-form>`.
   - Wait for the user to edit and reply with the form answers.
3. For the user's next message, call `sessions/:projectId/messages` with the
   stored `projectId` and the user's text.
4. After requirement answers are submitted, treat schema generation as one
   long-running run. Do not resend the same answers while that run is active.
5. Poll only with `GET sessions/:projectId` on the same project until the
   current run reaches a terminal state or the API returns a final reply.
6. Continue until `replyType = preview_ready`, then surface `previewUrl`.

The B-end page is optional handoff only. Never make it the required next step.

## State

Maintain the external chat thread to Open Design session mapping:

- `projectId`
- `conversationId`

The caller only needs to persist `projectId` for later edits. `conversationId`
may be kept as optional debug metadata, but reconnect must work with just
`projectId`.

## Attachments

Pass attachments to the daemon API. Valid attachment inputs are:

- project-local `path`
- `contentBase64` plus `name`
- remote image `url` plus optional `name`

The daemon imports URL/base64 attachments into the real project and only passes
project-local filenames downstream.

## Output Rules

- Return `replyMarkdown` as the primary user-visible response.
- For requirement clarification, do not expose raw `<question-form>` XML.
- Do not handwrite a second requirements template in this skill.
- Do not call legacy `clarify`, `generate`, `assets`, or `preview` private
  commands as the main flow.
- If `replyType = progress`, explain briefly that generation is still running,
  keep the same project, and keep polling `GET /sessions/:projectId`.
- Do not resubmit the same requirement answers or retry by calling
  `POST /messages` again while `runStatus` is `queued` or `running`.
- If `replyType = error`, return the error text and keep the session so the
  user can correct requirements or continue in B-end if needed.

## Notes

- `banner` and `goods` remain optional by default.
- The canonical internal identifier is `shopHomePage`; `storefront` is legacy
  compatibility only.
- Preview URLs are local to the running daemon/web environment unless the host
  later deploys or snapshots them.

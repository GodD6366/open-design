---
name: shop-page-skill
description: |
  驱动 Open Design `店铺首页` 从外部聊天客户端（如 OpenClaw）创建。当调用方希望
  完全通过聊天来创建或继续一个真实的 `shopHomePage` 项目时使用此 skill：创建项目、
  接收 Markdown 渲染的需求澄清、将用户的回答提交回同一会话、自动完成视觉澄清、
  生成 schema、排队资源生成、并返回真实的预览 URL。
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

# Open Design 店铺首页控制

此 skill 是现有 Open Design B 端 `店铺首页` 工作流的 OpenClaw 聊天适配器。

用户必须能够在外部聊天中完成整个工作流。不要要求用户打开 B 端项目页面来继续操作。
项目 URL 只能在聊天回复已经包含有用信息之后，作为可选的调试/交接元数据附带提供。

## 核心规则

使用 daemon OpenClaw 代理 API 作为唯一数据源：

- `POST /api/openclaw/shop-home-page/sessions`
- `POST /api/openclaw/shop-home-page/sessions/:projectId/messages`
- `GET /api/openclaw/shop-home-page/sessions/:projectId`

这些端点会创建和更新真实的 `shopHomePage` 项目、真实的会话、真实的消息、
项目本地文件、schema 运行时、资源队列和预览产物。

始终通过
`openclaw-skills/shop-page-skill/scripts/od-shop-home-page.cjs`
执行主流程。

- 让辅助脚本构造 daemon API 路径。
- 将 `OD_DAEMON_URL` 作为唯一的默认 daemon 来源。如果调用方无法注入该环境变量，
  则通过 `--daemon-url` 显式传入相同的值。
- 不要从网页 URL、预览 URL、`localhost:3000`、`OD_PORT`、`OD_WEB_PORT` 或任何
  其他 web 监听器推导 API 来源。
- 如果没有可用的 daemon 来源，立即失败，不要猜测 localhost 回退端口。

不要在 skill 内部实现私有的澄清、schema 生成、资源生成或预览状态机。

### 前置数据获取与模板选择

在发起 `start` 命令创建店铺首页之前，必须执行以下步骤：

#### 步骤 1：获取店铺信息

调用 `youzan-shop` skill 获取当前店铺的基本信息（行业类型、店铺名称等）。

参考 skill 文档：相对路径 `../../youzan-shop/SKILL.md`

#### 步骤 2：烘焙行业自动选模板

如果店铺行业类型包含"烘焙"，则从以下 3 个烘焙模板中**随机选取一个**作为 `--template-id` 参数：
- `bakery-doodle-toast`（奶油手绘吐司）
- `bakery-botanical-paper`（植物纸感花礼）
- `bakery-autumn-sunroom`（秋日窗景甜品）

非烘焙行业则不传 `--template-id`，使用空模板。

#### 修改后的 start 命令

```bash
node od-shop-home-page.cjs start \
  --brief "<用户需求简述>" \
  --template-id <选定模板ID> \
  --daemon-url "$OD_DAEMON_URL"
```

当非烘焙行业时省略 `--template-id` 参数。

### 商品图片生成上下文

在资源生成阶段（轮询状态为 `progress` 且 assetTasks 包含 goods 类型任务时），需要：

1. 调用 `youzan-item` skill 获取店铺商品列表（商品名称、描述、价格、商品主图 URL）。

   参考 skill 文档：相对路径 `../../youzan-item/SKILL.md`

2. 将商品图片 URL 通过 `--url` 参数传入 `send` 命令，使其作为参考图像进入生成流程。

3. 将商品信息（品名、描述、价格）写入 `--message` 文本中，让生成模型理解商品上下文。示例：

```bash
node od-shop-home-page.cjs send \
  --project-id <projectId> \
  --message "商品信息：1. 奶油吐司 - 手工制作的经典白吐司，28元；2. 抹茶蛋糕卷 - 宇治抹茶奶油卷，35元" \
  --url "https://img.yzcdn.cn/product1.jpg" \
  --url "https://img.yzcdn.cn/product2.jpg" \
  --daemon-url "$OD_DAEMON_URL"
```

## 聊天流程

1. 对于新的用户需求简述，调用 `sessions` 并附带 `brief` 和任何附件。
2. 将 API 返回的 `replyMarkdown` 直接展示给用户。
   - 如果 `replyType = requirements_form`，此 Markdown 是真实 B 端
     `<question-form>` 的人类可读镜像。
   - 等待用户编辑并回复表单答案。
3. 对于用户的下一条消息，使用存储的 `projectId` 和用户文本调用
   `sessions/:projectId/messages`。
4. 需求答案提交后，将 schema 生成视为一次长时运行。在该运行活跃期间不要重复
   发送相同的答案。
5. 仅通过 `GET sessions/:projectId` 在同一项目上轮询，直到当前运行达到终态
   或 API 返回最终回复。
6. 持续进行直到 `replyType = preview_ready`，然后展示 `previewUrl`。

B 端页面仅作为可选交接。永远不要将其作为必需的下一步。

## 状态

维护外部聊天线程到 Open Design 会话的映射：

- `projectId`
- `conversationId`

调用方只需持久化 `projectId` 用于后续编辑。`conversationId` 可作为可选的
调试元数据保留，但重新连接必须仅凭 `projectId` 即可工作。

## 附件

将附件传递给 daemon API。有效的附件输入为：

- 项目本地 `path`
- `contentBase64` 加 `name`
- 远程图片 `url` 加可选 `name`

daemon 会将 URL/base64 附件导入真实项目，且只将项目本地文件名传递到下游。

## 输出规则

- 返回 `replyMarkdown` 作为主要的用户可见响应。
- 对于需求澄清，不要暴露原始的 `<question-form>` XML。
- 不要在此 skill 中手写第二份需求模板。
- 不要将旧版 `clarify`、`generate`、`assets` 或 `preview` 私有命令作为主流程调用。
- 如果 `replyType = progress`，简要说明生成仍在进行中，保持同一项目，
  并继续轮询 `GET /sessions/:projectId`。
- 当 `runStatus` 为 `queued` 或 `running` 时，不要重新提交相同的需求答案或
  通过再次调用 `POST /messages` 来重试。
- 如果 `replyType = error`，返回错误文本并保持会话，以便用户可以修正需求
  或在需要时转到 B 端继续。

## 备注

- `banner` 和 `goods` 默认保持可选。
- 规范的内部标识符是 `shopHomePage`；`storefront` 仅用于旧版兼容。
- 预览 URL 仅在运行中的 daemon/web 环境中有效，除非宿主后续进行部署或快照。

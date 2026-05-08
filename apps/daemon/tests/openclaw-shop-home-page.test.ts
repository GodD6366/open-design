import { describe, expect, it } from 'vitest';
import {
  openClawNormalizeFormReply,
  openClawProjectPageUrl,
  openClawProjectPageUrlFromBase,
  openClawShopHomePageReplyFromAssistant,
} from '../src/openclaw-shop-home-page.js';
import { extractFirstQuestionForm } from '@open-design/contracts/question-form';

const QUESTION = `<question-form id="storefront-requirements" title="需求澄清">
{
  "description": "请补充店铺首页信息。",
  "questions": [
    { "id": "brand_name", "label": "店铺名称", "type": "text", "required": true },
    {
      "id": "modules",
      "label": "本次需要的模块",
      "type": "checkbox",
      "required": true,
      "options": ["top_slider（顶部主视觉轮播）", "user_assets（客户资产功能入口）"],
      "defaultValue": ["top_slider（顶部主视觉轮播）", "user_assets（客户资产功能入口）"]
    }
  ]
}
</question-form>`;

const session = {
  id: 'session-1',
  projectId: 'project-1',
  conversationId: 'conversation-1',
};

describe('OpenClaw shop-home-page helpers', () => {
  it('returns markdown requirements form instead of directing users to B-end page', () => {
    const response = openClawShopHomePageReplyFromAssistant({
      session,
      assistantText: `先确认一下需求。\n${QUESTION}`,
      state: { status: 'idle', validationErrors: [] },
      projectUrl: null,
    });

    expect(response.replyType).toBe('requirements_form');
    expect(response.projectId).toBe('project-1');
    expect('sessionId' in response).toBe(false);
    expect(response.replyMarkdown).toContain('## 需求澄清');
    expect(response.replyMarkdown).toContain('[form answers — storefront-requirements]');
    expect(response.replyMarkdown).not.toContain('<question-form');
    expect(response.replyMarkdown).not.toContain('打开');
    expect(response.projectUrl).toBeNull();
    expect(response.debug.projectUrl).toBeNull();
    expect(response.runStatus).toBeNull();
  });

  it('keeps optional B-end handoff URLs out of the primary response', () => {
    const response = openClawShopHomePageReplyFromAssistant({
      session,
      assistantText: '继续处理中。',
      state: { status: 'schema-ready', validationErrors: [] },
      projectUrl: 'http://127.0.0.1:17573/projects/project-1',
      runStatus: 'running',
    });

    expect(response.replyType).toBe('progress');
    expect(response.projectUrl).toBeNull();
    expect(response.debug.projectUrl).toBe('http://127.0.0.1:17573/projects/project-1');
    expect(response.runStatus).toBe('running');
  });

  it('does not treat schema-ready preview artifacts as final preview-ready chat output', () => {
    const response = openClawShopHomePageReplyFromAssistant({
      session,
      assistantText: '结构已生成。',
      state: { status: 'schema-ready', validationErrors: [] },
      previewUrl: 'http://127.0.0.1:17456/api/projects/p/files/shop-home-page.preview.html',
      tasks: [],
      runStatus: 'succeeded',
    });

    expect(response.replyType).toBe('progress');
    expect(response.previewUrl).toBe('http://127.0.0.1:17456/api/projects/p/files/shop-home-page.preview.html');
    expect(response.replyMarkdown).not.toContain('预览链接');
    expect(response.runStatus).toBe('succeeded');
  });

  it('normalizes user-edited markdown back to UI-equivalent form answers', () => {
    const form = extractFirstQuestionForm(QUESTION)!;
    const normalized = openClawNormalizeFormReply(
      form,
      [
        '- 店铺名称: 山野咖啡',
        '- 本次需要的模块: top_slider（顶部主视觉轮播）, user_assets（客户资产功能入口）',
      ].join('\n'),
    );

    expect(normalized).toBe([
      '[form answers — storefront-requirements]',
      '- 店铺名称: 山野咖啡',
      '- 本次需要的模块: top_slider（顶部主视觉轮播）, user_assets（客户资产功能入口）',
    ].join('\n'));
  });

  it('keeps project URL optional unless a web port is known', () => {
    expect(openClawProjectPageUrl({
      host: '127.0.0.1',
      resolvedPort: 17456,
      projectId: 'p1',
      webPort: 0,
    })).toBeNull();
    expect(openClawProjectPageUrl({
      host: '0.0.0.0',
      resolvedPort: 17456,
      projectId: 'p1',
      webPort: 17573,
    })).toBe('http://127.0.0.1:17573/projects/p1');
  });

  it('can derive project URLs from the current browser-visible base URL', () => {
    expect(openClawProjectPageUrlFromBase('http://192.168.1.8:17573', 'p1')).toBe('http://192.168.1.8:17573/projects/p1');
  });
});

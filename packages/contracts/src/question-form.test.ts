import { describe, expect, it } from 'vitest';
import {
  extractFirstQuestionForm,
  formatFormAnswers,
  parseSubmittedAnswers,
  questionFormToMarkdown,
} from './question-form.js';

const STOREFRONT_REQUIREMENTS_FORM = `<question-form id="storefront-requirements" title="需求澄清">
{
  "description": "请补充店铺首页生成所需信息。",
  "submitLabel": "继续视觉澄清",
  "questions": [
    { "id": "brand_name", "label": "店铺名称", "type": "text", "required": true, "placeholder": "例如：山野咖啡" },
    { "id": "industry", "label": "所属行业", "type": "text", "required": true },
    {
      "id": "modules",
      "label": "本次需要的模块",
      "type": "checkbox",
      "required": true,
      "options": ["top_slider（顶部主视觉轮播）", "user_assets（客户资产功能入口）"],
      "defaultValue": ["top_slider（顶部主视觉轮播）", "user_assets（客户资产功能入口）"]
    },
    {
      "id": "action_buttons",
      "label": "功能按钮需要覆盖哪些功能",
      "type": "checkbox",
      "options": ["到店自取", "外卖点单"],
      "defaultValue": ["到店自取", "外卖点单"]
    }
  ]
}
</question-form>`;

describe('question-form shared helpers', () => {
  it('turns the real form JSON into editable markdown without private templates', () => {
    const form = extractFirstQuestionForm(STOREFRONT_REQUIREMENTS_FORM);
    expect(form?.id).toBe('storefront-requirements');

    const markdown = questionFormToMarkdown(form!);

    expect(markdown).toContain('## 需求澄清');
    expect(markdown).toContain('[form answers — storefront-requirements]');
    expect(markdown).toContain('- 店铺名称:');
    expect(markdown).toContain('- 本次需要的模块: top_slider（顶部主视觉轮播）, user_assets（客户资产功能入口）');
    expect(markdown).toContain('本次需要的模块 要求: 必填；可多选，逗号分隔');
    expect(markdown).toContain('本次需要的模块 选项: top_slider（顶部主视觉轮播） / user_assets（客户资产功能入口）');
    expect(markdown).not.toContain('<question-form');
  });

  it('roundtrips edited markdown replies into UI-equivalent form answers', () => {
    const form = extractFirstQuestionForm(STOREFRONT_REQUIREMENTS_FORM)!;
    const reply = [
      '[form answers — storefront-requirements]',
      '- 店铺名称: 山野咖啡',
      '- 所属行业: 咖啡',
      '- 本次需要的模块: top_slider（顶部主视觉轮播）, user_assets（客户资产功能入口）',
      '- 功能按钮需要覆盖哪些功能: 到店自取, 外卖点单',
    ].join('\n');

    const answers = parseSubmittedAnswers(form, reply);
    expect(answers).toEqual({
      brand_name: '山野咖啡',
      industry: '咖啡',
      modules: ['top_slider（顶部主视觉轮播）', 'user_assets（客户资产功能入口）'],
      action_buttons: ['到店自取', '外卖点单'],
    });
    expect(formatFormAnswers(form, answers!)).toBe(reply);
  });
});

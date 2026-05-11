import { describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  openClawNormalizeFormReply,
  openClawProjectPageUrl,
  openClawProjectPageUrlFromBase,
  openClawShopHomePageReplyFromAssistant,
} from '../src/openclaw-shop-home-page.js';
import { extractFirstQuestionForm } from '@open-design/contracts/question-form';

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(import.meta.dirname, '../../..');
const skillDir = path.join(repoRoot, 'openclaw-skills/youzan-digital-store-designer');
const renderPageScript = path.join(skillDir, 'scripts/render-page.cjs');
const prepareWorkdirScript = path.join(skillDir, 'scripts/prepare-workdir.cjs');

function topSliderModule() {
  return {
    id: 'top_slider_1',
    type: 'top_slider',
    layout: { offsetY: 0, zIndex: 1, paddingX: 0, paddingTop: 0, paddingBottom: 0 },
    data: {
      mode: 'single',
      height: 500,
      items: [{ id: 'hero', image: '', image_prompt_schema: { type: 'carousel_banner' } }],
    },
  };
}

function bannerModule() {
  return {
    id: 'banner_1',
    type: 'banner',
    layout: { offsetY: 0, zIndex: 1, paddingX: 0, paddingTop: 0, paddingBottom: 0 },
    data: {
      mode: 'single',
      height: 200,
      items: [{ id: 'banner', image: '', image_prompt_schema: { type: 'banner' } }],
    },
  };
}

function userAssetsModule() {
  return {
    id: 'user_assets_1',
    type: 'user_assets',
    layout: { offsetY: 0, zIndex: 1, paddingX: 0, paddingTop: 0, paddingBottom: 0 },
    data: {
      greeting: 'Hello',
      nickname: '小赞宝用户',
      progress_percent: 33,
      height: 188,
      card_layout: { template_type: 3 },
      entries: [
        { id: 'entry_1', slot_id: 'left_1', title: '到店自取', subtitle: '提前下单免等待', image_prompt_schema: { type: 'user_asset_entry' } },
        { id: 'entry_2', slot_id: 'center_1', title: '外卖点单', subtitle: '送货上门更便捷', image_prompt_schema: { type: 'user_asset_entry' } },
        { id: 'entry_3', slot_id: 'right_1', title: '会员中心', subtitle: '专享会员权益', image_prompt_schema: { type: 'user_asset_entry' } },
      ],
    },
  };
}

async function renderSkillFixture({
  layoutMode = 'overlay',
  modules,
}: {
  layoutMode?: 'overlay' | 'flow';
  modules: Array<Record<string, any>>;
}) {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), 'openclaw-shop-home-page-'));
  await writeFile(path.join(rootDir, 'requirements.json'), `${JSON.stringify({
    status: 'confirmed',
    source_prompt: '创建烘焙店铺首页',
    industry: '烘焙',
    shop_name: '赞的面包店',
    modules: modules.map((module) => module.type),
    module_specs: modules.map((module) => ({
      type: module.type,
      content: module.type === 'top_slider' ? '春日新品手作烘焙' : '会员服务功能入口',
      itemCount: 1,
    })),
    action_buttons: { selected: ['到店自取', '外卖点单', '会员中心'], custom: '' },
    style: {
      industry: '烘焙',
      brand_name: '赞的面包店',
      tone: '暖奶油烘焙氛围',
      primary_color: '#D4A574',
      tone_palette: 'tone-warm-cream',
      avoid: [],
    },
    counts: { sliderCount: 1, goodsCount: 1 },
    reference_images: [],
    other_requirements: '',
    extended_answers: [],
  }, null, 2)}\n`);
  await writeFile(path.join(rootDir, 'schema.json'), `${JSON.stringify({
    page_id: 'shop_home_page',
    version: '1.0.0',
    layout_mode: layoutMode,
    design_context: {
      theme: 'tone_warm_cream',
      color_palette: {
        bg: '#F8EFE1',
        card_bg: '#FFFFFF',
        card_subtle: '#F6EEDC',
        text_primary: '#171717',
        text_secondary: '#7D6E61',
        accent: '#D4A574',
      },
      radius: '26px',
      shadow: '0 20px 52px rgba(128, 92, 47, 0.14)',
      spacing: 16,
      page_width: 375,
    },
    modules,
  }, null, 2)}\n`);
  await writeFile(path.join(rootDir, 'assets-manifest.json'), `${JSON.stringify({
    version: '1.0',
    items: {
      'top_slider_1.items.hero': { id: 'top_slider_1.items.hero', url: '', status: 'pending' },
      'banner_1.items.banner': { id: 'banner_1.items.banner', url: '', status: 'pending' },
      'user_assets_1.entries.entry_1': { id: 'user_assets_1.entries.entry_1', url: '', status: 'pending' },
      'user_assets_1.entries.entry_2': { id: 'user_assets_1.entries.entry_2', url: '', status: 'pending' },
      'user_assets_1.entries.entry_3': { id: 'user_assets_1.entries.entry_3', url: '', status: 'pending' },
    },
  }, null, 2)}\n`);

  await execFileAsync(process.execPath, [renderPageScript, rootDir], { cwd: repoRoot });

  return {
    rootDir,
    renderedSchema: JSON.parse(await readFile(path.join(rootDir, 'dist/schema.json'), 'utf8')),
    html: await readFile(path.join(rootDir, 'dist/shop-home-page.preview.html'), 'utf8'),
  };
}

async function runPrepareWorkdir(args: string[]) {
  const result = await execFileAsync(process.execPath, [prepareWorkdirScript, ...args], {
    cwd: repoRoot,
  }).catch((error: any) => error);
  const stdout = String(result.stdout ?? '');
  const stderr = String(result.stderr ?? '');
  return {
    code: typeof result.code === 'number' ? result.code : 0,
    stdout,
    stderr,
    json: stdout.trim() ? JSON.parse(stdout) : null,
  };
}

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
    },
    {
      "id": "ext_campaign_focus",
      "label": "本次重点想推什么",
      "type": "text"
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
        '- 本次重点想推什么: 新品礼盒',
      ].join('\n'),
    );

    expect(normalized).toBe([
      '[form answers — storefront-requirements]',
      '- 店铺名称: 山野咖啡',
      '- 本次需要的模块: top_slider（顶部主视觉轮播）, user_assets（客户资产功能入口）',
      '- 本次重点想推什么: 新品礼盒',
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

  it('renders static Skill user_assets with OD overlay layout and shared radius styles', async () => {
    const { renderedSchema, html } = await renderSkillFixture({
      modules: [topSliderModule(), userAssetsModule()],
    });
    const userAssets = renderedSchema.modules.find((module: any) => module.type === 'user_assets');
    expect(userAssets.layout).toMatchObject({
      offsetY: -56.25,
      zIndex: 3,
      paddingX: 16,
      paddingTop: 0,
      paddingBottom: 16,
    });
    expect(userAssets.data.height).toBeGreaterThan(188);

    expect(html).toContain('margin-top:-56.25px;z-index:3;padding-left:16px;padding-right:16px;padding-top:0px;padding-bottom:16px');
    expect(html).toContain('.sf-user-assets {\n  display: flex;\n  width: 100%;\n  min-height: 188px;');
    expect(html).toContain('border-radius: 8px;');
    expect(html).not.toContain('class="sf-user-assets-entry" style="border-radius:20px"');
    expect(html).not.toContain('class="sf-user-assets-entry" style="border-radius:24px"');
    expect(html).not.toContain('class="sf-user-assets-card" style="border-radius:20px"');
    expect(html).not.toContain('class="sf-user-assets-card" style="border-radius:24px"');
  });

  it('does not overlap static Skill user_assets in flow layout', async () => {
    const { renderedSchema, html } = await renderSkillFixture({
      layoutMode: 'flow',
      modules: [topSliderModule(), userAssetsModule()],
    });
    const userAssets = renderedSchema.modules.find((module: any) => module.type === 'user_assets');

    expect(userAssets.layout).toMatchObject({
      offsetY: 0,
      zIndex: 1,
      paddingX: 16,
      paddingTop: 16,
      paddingBottom: 16,
    });
    expect(html).toContain('margin-top:0px;z-index:1;padding-left:16px;padding-right:16px;padding-top:16px;padding-bottom:16px');
  });

  it('does not overlap static Skill user_assets when it is not directly after top_slider', async () => {
    const { renderedSchema, html } = await renderSkillFixture({
      modules: [topSliderModule(), bannerModule(), userAssetsModule()],
    });
    const userAssets = renderedSchema.modules.find((module: any) => module.type === 'user_assets');

    expect(userAssets.layout).toMatchObject({
      offsetY: 0,
      zIndex: 1,
      paddingX: 16,
      paddingTop: 16,
      paddingBottom: 16,
    });
    expect(html).toContain('margin-top:0px;z-index:1;padding-left:16px;padding-right:16px;padding-top:16px;padding-bottom:16px');
  });

  it('creates dated Skill workdirs under .dist when no history exists', async () => {
    const baseDir = await mkdtemp(path.join(os.tmpdir(), 'openclaw-skill-dist-'));
    const result = await runPrepareWorkdir(['--base-dir', baseDir, '--shop-name', '赞的面包店']);

    expect(result.code).toBe(0);
    expect(result.json).toMatchObject({
      ok: true,
      action: 'create_new',
      base_dir: baseDir,
      history_count: 0,
      needs_confirm: false,
    });
    expect(result.json.output_dir).toContain(`${baseDir}${path.sep}`);
    expect(result.json.output_dir).toMatch(new RegExp(`${path.sep}\\d{4}-\\d{2}-\\d{2}${path.sep}\\d{6}-赞的面包店$`));
  });

  it('requires confirmation before creating another Skill workdir when history exists', async () => {
    const baseDir = await mkdtemp(path.join(os.tmpdir(), 'openclaw-skill-dist-'));
    const existingDir = path.join(baseDir, '2026-05-11', '120000-赞的面包店');
    await mkdir(existingDir, { recursive: true });
    await writeFile(path.join(existingDir, 'requirements.json'), `${JSON.stringify({
      status: 'confirmed',
      shop_name: '赞的面包店',
    }, null, 2)}\n`);

    const blocked = await runPrepareWorkdir(['--base-dir', baseDir, '--shop-name', '新店']);
    expect(blocked.code).toBe(2);
    expect(blocked.json).toMatchObject({
      ok: false,
      action: 'confirm_required',
      base_dir: baseDir,
      history_count: 1,
      needs_confirm: true,
      latest_project: {
        dir: existingDir,
        shop_name: '赞的面包店',
      },
    });
    expect(blocked.json.output_dir).toBeUndefined();

    const forced = await runPrepareWorkdir(['--base-dir', baseDir, '--new', '--shop-name', '新店']);
    expect(forced.code).toBe(0);
    expect(forced.json).toMatchObject({
      ok: true,
      action: 'create_new',
      history_count: 1,
      needs_confirm: false,
    });
    expect(forced.json.output_dir).not.toBe(existingDir);

    const reused = await runPrepareWorkdir(['--base-dir', baseDir, '--reuse-latest']);
    expect(reused.code).toBe(0);
    expect(reused.json).toMatchObject({
      ok: true,
      action: 'reuse_latest',
      output_dir: existingDir,
      history_count: 1,
      needs_confirm: false,
    });
  });
});

import { describe, expect, it } from 'vitest';

import { collectAssetTasks } from '../src/shop-home-page.js';

describe('collectAssetTasks', () => {
  it('re-enqueues the first user_assets entry when schema metadata points at a missing file', () => {
    const schema = {
      modules: [
        {
          type: 'user_assets',
          data: {
            body_image: '',
            card_layout: {
              template_type: 1,
              slots: [
                { id: 'left', role: 'sub_action', size: 'medium', position: 'left' },
                { id: 'right', role: 'sub_action', size: 'medium', position: 'right' },
              ],
            },
            entries: [
              {
                id: 'left',
                slot_id: 'left',
                title: '到店自取',
                subtitle: '新鲜出炉 立等可取',
                icon: 'store',
                image: 'user-assets-entry-1.png',
                image_prompt_schema: {},
                reference_images: [],
              },
              {
                id: 'right',
                slot_id: 'right',
                title: '外卖点单',
                subtitle: '配送到家 准时送达',
                icon: 'truck',
                image: '',
                image_prompt_schema: {},
                reference_images: [],
              },
            ],
          },
        },
      ],
    };

    const tasks = collectAssetTasks(schema, null, false, new Set());

    expect(tasks.map((task) => task.fileName)).toEqual([
      'user-assets-entry-1.png',
      'user-assets-entry-2.png',
    ]);
    expect(tasks[1]?.dependsOnFileName).toBe('user-assets-entry-1.png');
  });
});

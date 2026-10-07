import { spawn } from 'node:child_process';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { previewProject } from '../index.js';

vi.mock('node:child_process', () => ({ spawn: vi.fn(() => ({ on: vi.fn() })) }));
vi.mock('../../../utils/platform.js', () => ({
  getPlatformSpawnArgs: () => ({ npxExecutableName: 'npx', shell: false }),
}));
vi.mock('@redocly/openapi-core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@redocly/openapi-core')>()),
  logger: { info: vi.fn(), error: vi.fn() },
}));

const argv = { product: 'realm', plan: 'enterprise', port: 4001, 'project-dir': '.' };

describe('previewProject', () => {
  beforeEach(() => vi.mocked(spawn).mockClear());

  it('runs the latest product package by default', async () => {
    await previewProject({ argv } as any);

    expect(vi.mocked(spawn).mock.calls[0][1]).toEqual([
      '-y',
      '@redocly/realm',
      'preview',
      '--plan=enterprise',
      '--port=4001',
    ]);
  });

  it('pins the product package to --product-version', async () => {
    await previewProject({ argv: { ...argv, 'product-version': '0.138.0-next.12' } } as any);

    expect(vi.mocked(spawn).mock.calls[0][1]).toEqual([
      '-y',
      '@redocly/realm@0.138.0-next.12',
      'preview',
      '--plan=enterprise',
      '--port=4001',
    ]);
  });
});

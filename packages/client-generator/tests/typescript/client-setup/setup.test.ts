/**
 * Behavioral e2e for `setup`: a publisher setup module baked into the generated client.
 * Generates a client with `setup`, then drives the baked runtime in a real consumer to prove
 * the defaults apply with no consumer `configure`/`use`, that a consumer can still override, and
 * that the baked setup also applies in the split two-file layout.
 */
import { generateClient } from '@redocly/client-generator';
import { rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyConsumer, runConsumer } from '../../helpers/helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, '../../fixtures/base.yaml');

describe('setup bakes publisher defaults into the single-file client', () => {
  let dir = '';
  beforeAll(async () => {
    dir = copyConsumer(join(__dirname, 'consumer'));
    await generateClient({
      api: fixture,
      output: join(dir, 'client.ts'),
      setup: join(dir, 'setup.ts'),
    });
  });
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test('a consumer with no configure/use still sends the baked URL + header', async () => {
    const captured = (await runConsumer(join(dir, 'baked-defaults.ts'))) as {
      url: string;
      header: string;
    };
    expect(new URL(captured.url).origin).toBe('https://baked.example.com');
    expect(captured.header).toBe('yes');
  });

  test('a consumer configure() overrides the baked default', async () => {
    const captured = (await runConsumer(join(dir, 'override-baked.ts'))) as { url: string };
    expect(new URL(captured.url).origin).toBe('https://override.example.com');
  });
});

describe('setup in the split layout', () => {
  let dir = '';
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test('applies in a multi-file layout (split) with no consumer setup', async () => {
    dir = copyConsumer(join(__dirname, 'consumer'));
    await generateClient({
      api: fixture,
      output: join(dir, 'client.ts'),
      setup: join(dir, 'setup.ts'),
      outputMode: 'split',
    });
    const captured = (await runConsumer(join(dir, 'baked-defaults.ts'))) as {
      url: string;
      header: string;
    };
    expect(new URL(captured.url).origin).toBe('https://baked.example.com');
    expect(captured.header).toBe('yes');
  });
});

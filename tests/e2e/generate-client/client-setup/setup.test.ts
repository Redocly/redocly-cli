/**
 * Behavioral e2e for `--setup`: a publisher setup module baked into the generated client.
 * Generates a client with `--setup`, then drives the baked runtime in a real consumer to prove
 * the defaults apply with no consumer `configure`/`use`, that a consumer can still override, and
 * that the baked setup also applies in the split two-file layout.
 */

import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyConsumer, runConsumer, runGenerateClient } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, '../fixtures/base.yaml');

/** Copy the consumer folder (with its setup.ts) and generate a client that bakes it in. */
function generateWithSetup(extraArgs: string[] = []): {
  dir: string;
  status: number | null;
  stderr: string;
} {
  const dir = copyConsumer(join(__dirname, 'consumer'));
  const result = runGenerateClient([
    fixture,
    '--output',
    join(dir, 'client.ts'),
    '--setup',
    join(dir, 'setup.ts'),
    ...extraArgs,
  ]);
  return { dir, status: result.status, stderr: result.stderr };
}

describe('--setup rejects remote modules', () => {
  test('a URL fails with the local-file-path error instead of a garbage path', () => {
    const result = runGenerateClient([
      fixture,
      '--output',
      join(tmpdir(), 'setup-url-client.ts'),
      '--setup',
      'https://evil.example/mod.ts',
    ]);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('must be a local file path');
  }, 60_000);
});

describe('--setup bakes publisher defaults into the single-file client', () => {
  let dir = '';
  beforeAll(() => {
    const generated = generateWithSetup();
    dir = generated.dir;
    expect(generated.status, generated.stderr).toBe(0);
  }, 60_000);
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
  }, 60_000);

  test('a consumer configure() overrides the baked default', async () => {
    const captured = (await runConsumer(join(dir, 'override-baked.ts'))) as { url: string };
    expect(new URL(captured.url).origin).toBe('https://override.example.com');
  }, 60_000);

  test('applies in a multi-file layout (split) with no consumer setup', async () => {
    const generated = generateWithSetup(['--output-mode', 'split']);
    try {
      expect(generated.status, generated.stderr).toBe(0);
      const captured = (await runConsumer(join(generated.dir, 'baked-defaults.ts'))) as {
        url: string;
        header: string;
      };
      expect(new URL(captured.url).origin).toBe('https://baked.example.com');
      expect(captured.header).toBe('yes');
    } finally {
      rmSync(generated.dir, { recursive: true, force: true });
    }
  }, 60_000);
});

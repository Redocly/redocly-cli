/**
 * Behavioral e2e for `--setup`: a publisher setup module baked into the generated client.
 * Generates a client with `--setup`, then drives the baked runtime in a real consumer to prove
 * the defaults apply with no consumer `configure`/`use`, that a consumer can still override, and
 * that the baked setup also applies in the split two-file layout.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { outdent } from 'outdent';

import { cliEntry, repoRoot, runConsumer } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, 'fixtures/base.yaml');

const SETUP = outdent`
  import { defineClientSetup, type RequestContext } from '@redocly/client-generator';
  export default defineClientSetup({
    config: { serverUrl: 'https://baked.example.com' },
    middleware: [{ onRequest: (ctx: RequestContext) => { ctx.headers['X-Baked'] = 'yes'; } }],
  });
`;

function generate(
  dir: string,
  extraArgs: string[] = []
): { status: number | null; stderr: string } {
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ type: 'module' }), 'utf-8');
  writeFileSync(join(dir, 'setup.ts'), SETUP, 'utf-8');
  return spawnSync(
    'node',
    [
      cliEntry,
      'generate-client',
      fixture,
      '--output',
      join(dir, 'client.ts'),
      '--setup',
      join(dir, 'setup.ts'),
      ...extraArgs,
    ],
    { encoding: 'utf-8', cwd: repoRoot }
  );
}

describe('--setup bakes publisher defaults into the single-file client', () => {
  let dir = '';
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'setup-'));
    const r = generate(dir);
    if (r.status !== 0) throw new Error(`generate failed:\n${r.stderr}`);
  }, 60_000);
  afterAll(() => {
    if (dir && existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  });

  test('a consumer with no configure/use still sends the baked URL + header', () => {
    const captured = runConsumer(
      dir,
      outdent`
        import { listPets } from './client.ts';
        let url = '', header = '';
        globalThis.fetch = (async (u: string, init: RequestInit) => {
          url = u; header = (init.headers as Record<string,string>)['X-Baked'];
          return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
        }) as unknown as typeof fetch;
        await listPets();
        console.log(JSON.stringify({ url, header }));
      `
    ) as { url: string; header: string };
    expect(new URL(captured.url).origin).toBe('https://baked.example.com');
    expect(captured.header).toBe('yes');
  }, 60_000);

  test('a consumer configure() overrides the baked default', () => {
    const captured = runConsumer(
      dir,
      outdent`
        import { configure, listPets } from './client.ts';
        let url = '';
        configure({ serverUrl: 'https://override.example.com', fetch: (async (u: string) => { url = u; return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } }); }) as unknown as typeof fetch });
        await listPets();
        console.log(JSON.stringify({ url }));
      `
    ) as { url: string };
    expect(new URL(captured.url).origin).toBe('https://override.example.com');
  }, 60_000);

  test('applies in a multi-file layout (split) with no consumer setup', () => {
    const dir2 = mkdtempSync(join(tmpdir(), 'setup-split-'));
    try {
      const r = generate(dir2, ['--output-mode', 'split']);
      expect(r.status, r.stderr).toBe(0);
      const captured = runConsumer(
        dir2,
        outdent`
          import { listPets } from './client.ts';
          let url = '', header = '';
          globalThis.fetch = (async (u: string, init: RequestInit) => { url = u; header = (init.headers as Record<string,string>)['X-Baked']; return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } }); }) as unknown as typeof fetch;
          await listPets();
          console.log(JSON.stringify({ url, header }));
        `
      ) as { url: string; header: string };
      expect(new URL(captured.url).origin).toBe('https://baked.example.com');
      expect(captured.header).toBe('yes');
    } finally {
      rmSync(dir2, { recursive: true, force: true });
    }
  }, 60_000);
});

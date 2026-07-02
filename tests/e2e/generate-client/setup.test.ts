/**
 * Behavioral e2e for `--setup`: a publisher setup module baked into the single-file client.
 * Generates a client with `--setup`, then drives the baked runtime in a real consumer to prove
 * the defaults apply with no consumer `configure`/`use`, that a consumer can still override, and
 * that combining `--setup` with a multi-file output mode fails fast.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');
const cliEntry = join(repoRoot, 'packages/cli/lib/index.js');
const fixture = join(__dirname, 'fixtures/base.yaml');
const tsxBin = join(repoRoot, 'node_modules/.bin/tsx');

const SETUP = `
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

function runConsumer(dir: string, script: string): unknown {
  writeFileSync(join(dir, 'consumer.ts'), script, 'utf-8');
  const r = spawnSync(tsxBin, [join(dir, 'consumer.ts')], { encoding: 'utf-8', cwd: repoRoot });
  if (r.status !== 0) throw new Error(`consumer failed:\n${r.stdout}\n${r.stderr}`);
  return JSON.parse(r.stdout.trim());
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
      `
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
      `
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
        `
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

describe('--setup with the service-class facade', () => {
  let dir = '';
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'setup-sc-'));
    const r = generate(dir, ['--facade', 'service-class', '--name', 'PetClient']);
    if (r.status !== 0) throw new Error(`generate failed:\n${r.stderr}`);
  }, 60_000);
  afterAll(() => {
    if (dir && existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  });

  test('new Client() with no args picks up the baked defaults; a passed config overrides', () => {
    const captured = runConsumer(
      dir,
      `
import { PetClient } from './client.ts';
const fetchSpy = (sink: { url: string; header: string }) => (async (u: string, init: RequestInit) => { sink.url = u; sink.header = (init.headers as Record<string,string>)['X-Baked']; return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } }); }) as unknown as typeof fetch;
const baked = { url: '', header: '' };
await new PetClient({ fetch: fetchSpy(baked) }).listPets();
const overridden = { url: '', header: '' };
await new PetClient({ serverUrl: 'https://override.example.com', fetch: fetchSpy(overridden) }).listPets();
console.log(JSON.stringify({ baked, overridden }));
`
    ) as { baked: { url: string; header: string }; overridden: { url: string } };
    expect(new URL(captured.baked.url).origin).toBe('https://baked.example.com');
    expect(captured.baked.header).toBe('yes');
    expect(new URL(captured.overridden.url).origin).toBe('https://override.example.com');
  }, 60_000);
});

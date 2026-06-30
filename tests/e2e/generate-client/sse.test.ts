// e2e for SSE (`text/event-stream`) operations: the typed `sse.*` async-iterator
// surface. We assert on the generated source (string checks) and strict-tsc the
// output (single-file, plus the whole tags-split dir) — the same lightweight
// harness used by error-mode.test.ts. The behavioral reconnect/abort path is
// covered separately by the sse-consumer harness in sse.runtime.test.ts.
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');
const cli = join(repoRoot, 'packages/cli/lib/index.js');
const tscBin = join(repoRoot, 'node_modules/.bin/tsc');

const TSCONFIG = {
  compilerOptions: {
    module: 'node16',
    moduleResolution: 'node16',
    target: 'es2022',
    lib: ['ES2022', 'DOM'],
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    types: [],
  },
};

/** Recursively collect every generated `.ts` file under `dir`. */
function collectTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectTsFiles(full));
    else if (entry.endsWith('.ts')) out.push(full);
  }
  return out;
}

const fixture = join(__dirname, 'fixtures', 'sse.yaml');

describe('generate-client SSE', () => {
  it('single-file, functions facade: __sse generator + sse aggregate + typed events, strict tsc passes', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ots-sse-single-'));
    const out = join(dir, 'client.ts');
    const res = spawnSync('node', [cli, 'generate-client', fixture, '--output', out], {
      encoding: 'utf-8',
      cwd: repoRoot,
    });
    expect(res.status, res.stderr).toBe(0);
    expect(existsSync(out)).toBe(true);

    const generated = readFileSync(out, 'utf-8');
    expect(generated).toContain('async function* __sse');
    expect(generated).toContain('export const sse = {');
    expect(generated).toContain('streamMessages');
    expect(generated).toContain('AsyncGenerator<ServerSentEvent<Message>>');
    // The typeless stream falls back to a `string` event payload + the 'text' data kind.
    expect(generated).toContain('__sse<string>');
    expect(generated).toContain(', "text")');

    // A type-usage snippet proving `ServerSentEvent<Message>.data.text` is typed
    // and that `SseOptions` (reconnect/reconnectDelay) is accepted.
    writeFileSync(
      join(dir, 'usage.ts'),
      [
        `import { sse, configure } from './client.js';`,
        `async function check() {`,
        `  for await (const ev of sse.streamMessages()) { const t: string = ev.data.text; void t; const id: string | undefined = ev.id; void id; }`,
        `  const it = sse.streamMessages({ reconnect: false, reconnectDelay: 500 });`,
        `  void it;`,
        `}`,
        `void check; void configure;`,
        ``,
      ].join('\n'),
      'utf-8'
    );

    writeFileSync(
      join(dir, 'tsconfig.json'),
      JSON.stringify({ ...TSCONFIG, include: ['client.ts', 'usage.ts'] }),
      'utf-8'
    );
    const tsc = spawnSync(tscBin, ['--noEmit', '-p', dir], { encoding: 'utf-8', cwd: repoRoot });
    expect(tsc.status, `tsc failed:\n${tsc.stdout}\n${tsc.stderr}`).toBe(0);
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('single-file, service-class facade: sse namespace bound on the class, strict tsc passes', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ots-sse-sc-'));
    const out = join(dir, 'client.ts');
    const res = spawnSync(
      'node',
      [cli, 'generate-client', fixture, '--output', out, '--facade', 'service-class'],
      { encoding: 'utf-8', cwd: repoRoot }
    );
    expect(res.status, res.stderr).toBe(0);
    expect(existsSync(out)).toBe(true);

    const generated = readFileSync(out, 'utf-8');
    expect(generated).toContain('readonly sse = {');
    expect(generated).toContain('streamMessages: this.streamMessages.bind(this)');

    writeFileSync(
      join(dir, 'tsconfig.json'),
      JSON.stringify({ ...TSCONFIG, include: ['client.ts'] }),
      'utf-8'
    );
    const tsc = spawnSync(tscBin, ['--noEmit', '-p', dir], { encoding: 'utf-8', cwd: repoRoot });
    expect(tsc.status, `tsc failed:\n${tsc.stdout}\n${tsc.stderr}`).toBe(0);
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('tags-split, functions facade: the entry barrel merges per-tag sse fragments, strict tsc passes over the dir', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ots-sse-split-'));
    const entry = join(dir, 'client.ts');
    const res = spawnSync(
      'node',
      [cli, 'generate-client', fixture, '--output', entry, '--output-mode', 'tags-split'],
      { encoding: 'utf-8', cwd: repoRoot }
    );
    expect(res.status, res.stderr).toBe(0);
    expect(existsSync(entry)).toBe(true);

    // The entry barrel merges each per-tag SSE fragment into the public `sse`.
    const entrySrc = readFileSync(entry, 'utf-8');
    expect(entrySrc).toContain('export const sse = { ...__sse_');

    const files = collectTsFiles(dir);
    const tsc = spawnSync(
      tscBin,
      [
        '--noEmit',
        '--strict',
        '--noUnusedLocals',
        '--target',
        'ES2020',
        '--module',
        'esnext',
        '--moduleResolution',
        'bundler',
        '--lib',
        'ES2020,DOM',
        ...files,
      ],
      { encoding: 'utf-8', cwd: dir }
    );
    expect(tsc.status, `tsc failed:\n${tsc.stdout}\n${tsc.stderr}`).toBe(0);
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);
});

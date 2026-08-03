// e2e for SSE (`text/event-stream`) operations: the typed flat async-iterator
// surface (`for await (const ev of streamMessages())`). We assert on the generated
// source (string checks) and strict-tsc the output (single-file, plus the split
// two-file set) — the same lightweight harness used by error-mode.test.ts. The
// behavioral reconnect/abort path is covered separately by the sse-consumer
// harness in sse.runtime.test.ts.
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
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generate, strictTypecheck, tscBin } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
  it('single-file: embedded sse capability + flat typed stream sugar, strict tsc passes', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ots-sse-single-'));
    const out = join(dir, 'client.ts');
    generate(fixture, out);
    expect(existsSync(out)).toBe(true);

    const generated = readFileSync(out, 'utf-8');
    // The embedded runtime carries the sse capability generator.
    expect(generated).toContain('async function* sse<T>(');
    // Stream operations are typed `kind: "sse"` in Ops and marked in the descriptors.
    expect(generated).toContain('kind: "sse";');
    expect(generated).toContain('responseKind: "sse"');
    // JSON payloads decode as json; the typeless stream falls back to text/string.
    expect(generated).toContain(
      'streamMessages: { id: "streamMessages", method: "GET", path: "/messages", tags: ["Messages"], responseKind: "sse", sseDataKind: "json" }'
    );
    expect(generated).toContain(
      'streamTicks: { id: "streamTicks", method: "GET", path: "/ticks", tags: ["Ticks"], responseKind: "sse", sseDataKind: "text" }'
    );
    expect(generated).toMatch(/streamTicks: \{\s*args: \{\};\s*result: string;\s*kind: "sse";/);
    // Flat call sugar: an SSE op is a top-level export returning the async generator.
    expect(generated).toContain(
      'export const streamMessages = (init: SseOptions = {}) => client.streamMessages({}, init);'
    );

    // A type-usage snippet proving `ServerSentEvent<Message>.data.text` is typed
    // and that `SseOptions` (reconnect/reconnectDelay) is accepted.
    writeFileSync(
      join(dir, 'usage.ts'),
      [
        `import { streamMessages, configure } from './client.js';`,
        `async function check() {`,
        `  for await (const ev of streamMessages()) { const t: string = ev.data.text; void t; const id: string | undefined = ev.id; void id; }`,
        `  const it = streamMessages({ reconnect: false, reconnectDelay: 500 });`,
        `  void it;`,
        `}`,
        `void check; void configure;`,
        ``,
      ].join('\n'),
      'utf-8'
    );

    strictTypecheck(dir, ['client.ts', 'usage.ts']);
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('split: SSE ops live in the entry beside the embedded runtime, strict tsc passes over both files', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ots-sse-split-'));
    const entry = join(dir, 'client.ts');
    generate(fixture, entry, ['--output-mode', 'split']);
    expect(existsSync(entry)).toBe(true);

    const entrySrc = readFileSync(entry, 'utf-8');
    expect(entrySrc).toContain('async function* sse<T>(');
    expect(entrySrc).toContain('export const streamMessages = (init: SseOptions = {})');

    const files = collectTsFiles(dir);
    expect(files.map((f) => f.split('/').pop()).sort()).toEqual(['client.schemas.ts', 'client.ts']);
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

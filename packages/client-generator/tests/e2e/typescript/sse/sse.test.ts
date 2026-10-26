// Tests the generated surface of SSE (`text/event-stream`) operations: the typed flat
// async-iterator (`for await (const ev of streamMessages())`). We assert on the generated
// source and strict-tsc the output (single-file, plus the split two-file set).
// sse.runtime.test.ts covers the reconnect and abort behavior.

import { generateClient } from '@redocly/client-generator';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyConsumer, expectStrictTscPasses } from '../../helpers/helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const fixture = join(__dirname, '../../fixtures', 'sse.yaml');

describe('generate-client SSE', () => {
  let dir = '';

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('single-file: embedded sse capability + flat typed stream sugar, strict tsc passes', async () => {
    dir = copyConsumer(join(__dirname, 'consumer-types'));
    const out = join(dir, 'client.ts');
    await generateClient({ api: fixture, output: out });
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
    // The binding is the client's own method, which returns the async generator.
    expect(generated).toContain(
      'export const { getHealth, streamMessages, streamAbort, streamTicks } = client;'
    );

    // consumer-types/usage.ts proves `ServerSentEvent<Message>.data.text` is typed
    // and that `SseOptions` (reconnect/reconnectDelay) is accepted.
    expectStrictTscPasses(dir, ['client.ts', 'usage.ts']);
  });

  it('split: SSE ops live in the entry beside the embedded runtime, strict tsc passes over both files', async () => {
    dir = mkdtempSync(join(tmpdir(), 'ots-sse-split-'));
    const entry = join(dir, 'client.ts');
    await generateClient({ api: fixture, output: entry, outputMode: 'split' });

    expect(readdirSync(dir).sort()).toEqual(['client.schemas.ts', 'client.ts']);

    const entrySource = readFileSync(entry, 'utf-8');
    expect(entrySource).toContain('async function* sse<T>(');
    expect(entrySource).toContain(
      'export const { getHealth, streamMessages, streamAbort, streamTicks } = client;'
    );

    expectStrictTscPasses(dir);
  });
});

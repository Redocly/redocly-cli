// Query-parameter serialization styles (P3.8). Generates a client from a spec
// declaring non-default query styles, strict-`tsc`s it (the descriptor `params`
// hints must satisfy `ParamSpec`), asserts the emitted source, and proves the
// WIRE FORMAT behaviorally.
//
// Behavioral approach: rather than stand up a mock server, we import the
// generated client and stub `config.fetch` (via `configure`) to capture the
// request URL, then assert it directly. This is the lightest harness that
// proves the runtime's `buildUrl` output (literal delimiters + allowReserved
// on the wire), which is the whole point of the feature.

import { generateClient } from '@redocly/client-generator';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyConsumer, runTsx, strictTypecheck } from '../../helpers/helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, 'openapi.yaml');

describe('generate-client query serialization styles', () => {
  let dir: string;
  let generated: string;

  beforeAll(async () => {
    dir = copyConsumer(join(__dirname, 'consumer'));
    const out = join(dir, 'client.ts');
    await generateClient({ api: fixture, output: out });
    expect(existsSync(out)).toBe(true);
    generated = readFileSync(out, 'utf-8');
  }, 60_000);

  afterAll(() => {
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it('emits style hints on the descriptor params, and none for the default param', () => {
    // Styled array params carry their explicit style/explode on the descriptor.
    expect(generated).toContain(
      '{ name: "tags", in: "query", style: "pipeDelimited", explode: false }'
    );
    expect(generated).toContain(
      '{ name: "q", in: "query", style: "spaceDelimited", explode: false }'
    );
    expect(generated).toContain('{ name: "ids", in: "query", style: "form", explode: false }');
    // allowReserved param keeps the default form+explode but flags allowReserved.
    expect(generated).toContain('{ name: "filter", in: "query", allowReserved: true }');
    // The default param `limit` carries NO style hints.
    expect(generated).toContain('{ name: "limit", in: "query" }');
  });

  it('strict-tsc type-checks the generated client', () => {
    strictTypecheck(dir, ['client.ts']);
  }, 60_000);

  it('serializes the wire format: literal delimiters + allowReserved', async () => {
    // consumer/capture-url.mts stubs config.fetch to capture the URL and writes it to stdout.
    const runner = join(dir, 'capture-url.mts');
    const run = await runTsx(runner, [], { cwd: dir });
    expect(run.status, `consumer stderr:\n${run.stderr}`).toBe(0);
    const url = run.stdout.trim();
    // pipeDelimited: literal `|` on the wire (NOT %7C).
    expect(url).toContain('tags=a|b');
    // spaceDelimited: literal `%20` space delimiter between values.
    expect(url).toContain('q=x%20y');
    // form + explode:false: literal `,` delimiter.
    expect(url).toContain('ids=1,2');
    // allowReserved: the `/` survives un-encoded (NOT %2F).
    expect(url).toContain('filter=a/b');
    // The default param still encodes normally.
    expect(url).toContain('limit=5');
  }, 60_000);
});

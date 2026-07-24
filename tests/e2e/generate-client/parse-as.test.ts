// Verifies the `parseAs` runtime escape hatch on the per-call `RequestOptions`:
// the generated client emits the `ParseAs` type, threads `parseAs?` through
// `RequestOptions`, and `__parse` decodes every kind (json/text/blob/arrayBuffer/
// formData/stream/auto). We assert on the emitted source, prove the whole client
// type-checks under strict `tsc`, and append a consumer snippet that calls an
// operation with `{ parseAs: 'stream' }` / `{ parseAs: 'text' }` — type-checking
// that proves the option is accepted by the generated operation signatures.
//
// No mock-server behavioral assertion here: `parseAs` is a pure runtime branch in
// the runtime's `parse` (covered by the client-generator unit suite) and the
// cafe-consumer harness already exercises the default decoding path. Strict-tsc +
// string + type-usage assertions are sufficient and keep this test process-light.
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generate, strictTypecheck } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('generate-client parseAs', () => {
  it('emits ParseAs + parseAs option, decodes every kind, and accepts parseAs per call', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ots-parseas-'));
    const out = join(dir, 'client.ts');
    generate(join(__dirname, 'fixtures', 'no-operationid.yaml'), out);
    expect(existsSync(out)).toBe(true);
    const generated = readFileSync(out, 'utf-8');

    // The public `ParseAs` type and the option on `RequestOptions`.
    expect(generated).toContain(
      "export type ParseAs = 'auto' | 'json' | 'text' | 'blob' | 'arrayBuffer' | 'formData' | 'stream';"
    );
    expect(generated).toMatch(/parseAs\?: ParseAs/);

    // The runtime's `parse` covers the streaming / arrayBuffer / formData branches.
    expect(generated).toContain('return response.body;');
    expect(generated).toContain('return response.arrayBuffer();');
    expect(generated).toContain('return response.formData();');

    // A type-level consumer: calling the operation with `parseAs` must compile.
    writeFileSync(
      join(dir, 'usage.ts'),
      [
        "import { getGiftcardsCardId } from './client.js';",
        '',
        'export async function streamUsage() {',
        "  return getGiftcardsCardId({ parseAs: 'stream' });",
        '}',
        '',
        'export async function textUsage() {',
        "  return getGiftcardsCardId({ parseAs: 'text' });",
        '}',
        '',
        '// @ts-expect-error — parseAs is a closed union; bogus kinds are rejected.',
        "export const bogus = getGiftcardsCardId({ parseAs: 'xml' });",
        '',
      ].join('\n'),
      'utf-8'
    );
    strictTypecheck(dir, ['client.ts', 'usage.ts']);
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);
});

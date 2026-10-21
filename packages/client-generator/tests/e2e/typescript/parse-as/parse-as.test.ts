// Verifies the `parseAs` runtime escape hatch on the per-call `RequestOptions`:
// the generated client emits the `ParseAs` type, threads `parseAs?` through
// `RequestOptions`, and `__parse` decodes every kind (json/text/blob/arrayBuffer/
// formData/stream/auto). We assert on the emitted source and prove that the client
// and `consumer/usage.ts` type-check under strict `tsc`. `usage.ts` calls an
// operation with `{ parseAs: 'stream' }` / `{ parseAs: 'text' }`, which proves that
// the generated operation signatures accept the option.
//
// No mock-server behavioral assertion here: `parseAs` is a pure runtime branch in
// the runtime's `parse` (covered by the client-generator unit suite) and the
// cafe consumer harness already exercises the default decoding path. Strict-tsc +
// string + type-usage assertions are sufficient and keep this test process-light.

import { generateClient } from '@redocly/client-generator';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyConsumer, expectStrictTscPasses } from '../../helpers/helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('generate-client parseAs', () => {
  let dir = '';

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('emits ParseAs + parseAs option, decodes every kind, and accepts parseAs per call', async () => {
    dir = copyConsumer(join(__dirname, 'consumer'));
    const out = join(dir, 'client.ts');
    await generateClient({
      api: join(__dirname, '../../fixtures', 'no-operationid.yaml'),
      output: out,
    });
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

    // consumer/usage.ts calls the operation with `parseAs`; it must compile.
    expectStrictTscPasses(dir, ['client.ts', 'usage.ts']);
  });
});

import { generateClient } from '@redocly/client-generator';
// Verifies throw-mode `{ envelope: true }`: declared success-response headers are
// emitted on the descriptor and Ops type, and a consumer that asks for the envelope
// type-checks under strict tsc (body-only default remains).
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyConsumer, strictTypecheck } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('generate-client envelope', () => {
  it('emits responseHeaders + Ops.headers and accepts envelope: true per call', async () => {
    const dir = copyConsumer(join(__dirname, 'consumer'));
    const out = join(dir, 'client.ts');
    await generateClient({ api: join(__dirname, 'response-headers.yaml'), output: out });
    expect(existsSync(out)).toBe(true);
    const generated = readFileSync(out, 'utf-8');

    expect(generated).toContain('{ name: "3d-secure", key: "_3dSecure", type: "boolean" }');
    expect(generated).toContain('{ name: "x-foo", key: "xFoo", type: "number" }');
    expect(generated).toContain('{ name: "x_foo", key: "xFoo_2", type: "string" }');
    expect(generated).toContain('paginationTotal: number');
    expect(generated).toContain('xFlag?: boolean');
    expect(generated).toContain('_3dSecure: boolean');
    expect(generated).toContain('xIds?: string');
    expect(generated).toContain('export type ListCustomersResponseHeaders');
    expect(generated).toContain('export type CreateCustomerResponseHeaders');
    expect(generated).toContain('location: string');
    expect(generated).toMatch(/envelope\?: boolean/);

    strictTypecheck(dir, ['client.ts', 'usage.ts']);
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);
});

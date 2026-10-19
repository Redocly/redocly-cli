// Verifies throw-mode `{ envelope: true }`: declared success-response headers are
// emitted on the descriptor and Ops type, and a consumer that asks for the envelope
// type-checks under strict tsc (body-only default remains).
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generate, strictTypecheck } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('generate-client envelope', () => {
  it('emits responseHeaders + Ops.headers and accepts envelope: true per call', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ots-envelope-'));
    const out = join(dir, 'client.ts');
    generate(join(__dirname, 'response-headers.yaml'), out);
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

    copyFileSync(join(__dirname, 'consumer', 'usage.ts'), join(dir, 'usage.ts'));
    strictTypecheck(dir, ['client.ts', 'usage.ts']);
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);
});

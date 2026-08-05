// Verifies throw-mode `{ envelope: true }`: declared success-response headers are
// emitted on the descriptor and Ops type, and a consumer that asks for the envelope
// type-checks under strict tsc (body-only default remains).
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generate, strictTypecheck } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('generate-client envelope', () => {
  it('emits responseHeaders + Ops.headers and accepts envelope: true per call', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ots-envelope-'));
    const out = join(dir, 'client.ts');
    generate(join(__dirname, 'fixtures', 'response-headers.yaml'), out);
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

    writeFileSync(
      join(dir, 'usage.ts'),
      [
        "import { client, createCustomer, listCustomers } from './client.js';",
        '',
        'export async function bodyOnly() {',
        '  const rows = await listCustomers();',
        '  return rows.map((row) => row.id);',
        '}',
        '',
        // Options that never mention `envelope` keep the plain body type.
        'export async function bodyWithOptions() {',
        "  const rows = await listCustomers({ headers: { 'X-Trace': '1' } });",
        "  const viaClientRows = await client.listCustomers({}, { parseAs: 'json' });",
        '  return rows.map((row) => row.id).concat(viaClientRows.map((row) => row.id));',
        '}',
        '',
        // Flat sugar: no-input ops take `init` as the first argument.
        'export async function withEnvelope() {',
        '  const { data, headers, response } = await listCustomers({ envelope: true });',
        '  const total: number = headers.paginationTotal;',
        '  const flag: boolean | undefined = headers.xFlag;',
        '  const secure: boolean = headers._3dSecure;',
        '  const ids: string | undefined = headers.xIds;',
        "  const raw = response.headers.get('X-Undocumented');",
        '  return { rows: data.map((row) => row.id), total, flag, secure, ids, raw };',
        '}',
        '',
        // Instance client uses the grouped args + trailing init shape.
        'export async function viaClient() {',
        '  const { data, headers } = await client.listCustomers({}, { envelope: true });',
        '  return { data, total: headers.paginationTotal };',
        '}',
        '',
        'export async function bodylessResponse() {',
        "  const { data, headers } = await createCustomer('cus_1', { envelope: true });",
        '  const nothing: void = data;',
        '  const location: string = headers.location;',
        '  return { nothing, location };',
        '}',
        '',
        'export async function widenedEnvelopeOption() {',
        '  const options = { envelope: true };',
        '  const result = await listCustomers(options);',
        "  return 'response' in result ? result.data.length : result.length;",
        '}',
        '',
        'export async function widenedClientOption() {',
        '  const options = { envelope: true };',
        '  const result = await client.listCustomers({}, options);',
        "  return 'response' in result ? result.data.length : result.length;",
        '}',
        '',
      ].join('\n'),
      'utf-8'
    );
    strictTypecheck(dir, ['client.ts', 'usage.ts']);
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);
});

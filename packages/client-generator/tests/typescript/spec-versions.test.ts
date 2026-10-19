import { generateClient } from '@redocly/client-generator';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { strictTypecheck } from '../helpers/helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('generate-client spec versions', () => {
  let dir = '';

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  async function generateAndTypecheck(fixture: string): Promise<string> {
    dir = mkdtempSync(join(tmpdir(), 'ots-specver-'));
    const out = join(dir, 'client.ts');
    await generateClient({ api: join(__dirname, '../fixtures', fixture), output: out });
    expect(existsSync(out)).toBe(true);
    strictTypecheck(dir, ['client.ts']);
    return readFileSync(out, 'utf-8');
  }

  it('generates a type-checking client from a Swagger 2.0 document', async () => {
    const generated = await generateAndTypecheck('swagger2.yaml');
    expect(generated).toContain('export const { getPet, createPet } = client;');
    expect(generated).toContain('export type Pet');
    expect(generated).toContain('serverUrl: "https://api.example.com/v2"');
  }, 60_000);

  it('generates a type-checking client from an OpenAPI 3.2 document', async () => {
    const generated = await generateAndTypecheck('oas3.2.yaml');
    expect(generated).toContain('export const { getThing } = client;');
    expect(generated).toContain('export type Thing');
    // 3.1/3.2 nullable enum renders as a nullable union.
    expect(generated).toMatch(/status\?:\s*\("active" \| "archived"\) \| null;/);
  }, 60_000);

  it('synthesizes operation names from method+path when operationId is omitted', async () => {
    const generated = await generateAndTypecheck('no-operationid.yaml');
    expect(generated).toContain('getGiftcardsCardId } = client;');
  }, 60_000);
});

/**
 * Behavioral e2e for typed multipart bodies (#5): the generated client takes a typed object
 * and serializes it to `FormData` via the runtime's multipart capability — binary→Blob,
 * arrays→repeated fields, objects→JSON parts. We inject a fake `fetch` and inspect the
 * FormData it actually sent.
 */

import { generateClient } from '@redocly/client-generator';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectTsFiles, copyConsumer, expectTscPasses, runConsumer } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const spec = join(__dirname, 'upload.yaml');

describe('generate-client typed multipart body (#5)', () => {
  let dir = '';
  afterEach(() => {
    if (dir && existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  });

  it('types the fields (binary→Blob) and serializes the object to FormData', async () => {
    dir = copyConsumer(join(__dirname, 'consumer'));
    await generateClient({ api: spec, output: join(dir, 'client.ts') });

    const result = runConsumer(join(dir, 'typed-fields.ts')) as Record<string, unknown>;

    expect(result.isFormData).toBe(true);
    expect(result.orgId).toBe('org_1');
    expect(result.fileIsBlob).toBe(true);
    expect(result.tags).toEqual(['a', 'b']); // array → one field per item
    expect(result.meta).toBe('{"k":"v"}'); // nested object → JSON part
  }, 60_000);

  it('serializes the multipart body AFTER onRequest, so middleware can mutate it', async () => {
    dir = copyConsumer(join(__dirname, 'consumer'));
    await generateClient({ api: spec, output: join(dir, 'client.ts') });

    const result = runConsumer(join(dir, 'mutate-in-on-request.ts')) as Record<string, unknown>;

    expect(result.isFormData).toBe(true);
    expect(result.orgId).toBe('mutated');
  }, 60_000);

  it('compiles in split output (multipart serialization lives in the embedded runtime)', async () => {
    dir = mkdtempSync(join(tmpdir(), 'ots-multipart-split-'));
    await generateClient({ api: spec, output: join(dir, 'client.ts'), outputMode: 'split' });
    const files = collectTsFiles(dir);
    expectTscPasses(
      [
        '--noEmit',
        '--strict',
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
      dir
    );
  }, 60_000);
});

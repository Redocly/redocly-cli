import { createConfig } from '@redocly/openapi-core';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { outdent } from 'outdent';

import { loadSpec } from '../loader.js';

describe('loadSpec', () => {
  let workDir: string;

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), 'client-gen-loader-'));
  });

  afterEach(async () => {
    await rm(workDir, { recursive: true, force: true });
  });

  async function write(name: string, contents: string): Promise<string> {
    const file = join(workDir, name);
    await writeFile(file, contents, 'utf-8');
    return file;
  }

  it('loads a valid OpenAPI document and returns the parsed bundle', async () => {
    const file = await write(
      'minimal.yaml',
      outdent`
        openapi: 3.0.3
        info:
          title: Minimal
          version: 1.0.0
        paths: {}
      `
    );

    const { document } = await loadSpec(file);
    expect(document.openapi).toBe('3.0.3');
    expect(document.info?.title).toBe('Minimal');
  });

  it('uses a caller-supplied Config instead of building a fresh one', async () => {
    const file = await write(
      'with-config.yaml',
      outdent`
        openapi: 3.0.3
        info:
          title: Minimal
          version: 1.0.0
        paths: {}
      `
    );
    const config = await createConfig({});
    const { document } = await loadSpec(file, config);
    expect(document.openapi).toBe('3.0.3');
  });

  // The underlying `bundle()` already validates document shape and OpenAPI version, so
  // these failure paths are exercised by openapi-core itself. We re-assert that the loader
  // surfaces those errors instead of swallowing them.
  it('detects the spec version (oas3_0)', async () => {
    const file = await write(
      'oas3_0.yaml',
      outdent`
        openapi: 3.0.3
        info:
          title: Minimal
          version: 1.0.0
        paths: {}
      `
    );
    const result = await loadSpec(file);
    expect(result.version).toBe('oas3_0');
  });

  it('propagates errors from bundle() for null/empty documents', async () => {
    const file = await write('null.yaml', 'null\n');
    await expect(loadSpec(file)).rejects.toThrow();
  });

  it('propagates errors from bundle() for documents missing "openapi"', async () => {
    const file = await write('no-openapi.yaml', 'foo: bar\n');
    await expect(loadSpec(file)).rejects.toThrow();
  });

  it('propagates errors from bundle() for non-string "openapi" values', async () => {
    const file = await write(
      'numeric-openapi.yaml',
      'openapi: 3\ninfo:\n  title: x\n  version: y\npaths: {}\n'
    );
    await expect(loadSpec(file)).rejects.toThrow();
  });
});

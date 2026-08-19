import { logger } from '@redocly/openapi-core';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { outdent } from 'outdent';

import { collectGeneratedFiles } from '../generate.js';
import { generateClient } from '../index.js';
import type { ApiModel } from '../intermediate-representation/model.js';

function model(): ApiModel {
  return {
    title: 'T',
    version: '1',
    serverUrl: 'https://x',
    services: [{ name: 'Default', operations: [] }],
    schemas: [],
    securitySchemes: [],
  };
}

describe('generateClient output validation', () => {
  it("rejects output paths with a literal 'undefined' or 'null' segment (interpolation-bug telltale)", async () => {
    const { generateClient } = await import('../index.js');
    for (const output of ['undefined/api.ts', 'out/null/api.ts', 'undefined']) {
      await expect(generateClient({ api: 'unused.yaml', output })).rejects.toThrow(
        /looks like an interpolation bug/
      );
    }
    // A file merely NAMED undefined.* is legitimate — only exact segments are rejected.
    await expect(
      generateClient({ api: 'unused.yaml', output: 'out/undefined.ts' })
    ).rejects.not.toThrow(/interpolation/);
  });
});

describe('generateClient setup validation', () => {
  it('rejects a URL setup specifier upfront (local file paths only)', async () => {
    const { generateClient } = await import('../index.js');
    for (const url of ['https://cdn.example.com/setup.ts', 'file:///tmp/setup.ts']) {
      await expect(
        generateClient({ api: 'unused.yaml', output: '/tmp/never.ts', setup: url })
      ).rejects.toThrow(/local file path/);
    }
    // A Windows-style drive path must NOT be mistaken for a URL scheme (it fails
    // later on file reading, not on the scheme guard).
    await expect(
      generateClient({ api: 'unused.yaml', output: '/tmp/never.ts', setup: 'C:\\team\\setup.ts' })
    ).rejects.not.toThrow(/local file path/);
  });

  it('resolves a relative setup path against configDir, as documented', async () => {
    // The test runs with a cwd far from `dir`, so a cwd-based resolve would ENOENT.
    const dir = await mkdtemp(join(tmpdir(), 'setup-configdir-'));
    try {
      await writeFile(
        join(dir, 'openapi.yaml'),
        outdent`
          openapi: 3.1.0
          info: { title: t, version: '1' }
          paths:
            /a:
              get:
                operationId: getA
                responses:
                  '204': { description: no content }
        `
      );
      await writeFile(
        join(dir, 'setup.ts'),
        `export default { config: { serverUrl: 'https://baked.example.com' } };`
      );
      await generateClient({
        api: join(dir, 'openapi.yaml'),
        output: join(dir, 'client.ts'),
        setup: './setup.ts',
        configDir: dir,
      });
      expect(await readFile(join(dir, 'client.ts'), 'utf-8')).toContain(
        'https://baked.example.com'
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('collectGeneratedFiles', () => {
  it('runs the given generators and concatenates their files', () => {
    const files = collectGeneratedFiles(model(), {
      outputPath: '/out/api.ts',
      outputMode: 'single',
      emit: {},
      generators: ['typescript'],
    });
    expect(files.length).toBe(1);
    expect(files[0].path).toBe('/out/api.ts');
  });

  it('throws when two generators emit the same path', () => {
    expect(() =>
      collectGeneratedFiles(model(), {
        outputPath: '/out/api.ts',
        outputMode: 'single',
        emit: {},
        generators: ['typescript', 'typescript'],
      })
    ).toThrow(/already emitted/);
  });

  it('rejects a generated file path that escapes the output directory', () => {
    const escapes = [
      { name: 'traversal', path: '../../outside.txt' },
      { name: 'absolute', path: '/etc/outside.txt' },
    ];
    for (const attempt of escapes) {
      const registry = new Map([['rogue', { run: () => [{ path: attempt.path, content: 'x' }] }]]);
      expect(() =>
        collectGeneratedFiles(model(), {
          outputPath: '/out/api.ts',
          outputMode: 'single',
          emit: {},
          generators: ['rogue'],
          registry,
        })
      ).toThrow(/Generator "rogue" failed: .*escapes the output directory/);
    }
    // A relative path resolves against the output directory — the same base the guard
    // checked — never against the cwd at write time.
    const relativeRegistry = new Map([
      ['relative', { run: () => [{ path: 'fixtures/data.json', content: '{}' }] }],
    ]);
    expect(
      collectGeneratedFiles(model(), {
        outputPath: '/out/api.ts',
        outputMode: 'single',
        emit: {},
        generators: ['relative'],
        registry: relativeRegistry,
      })[0].path
    ).toBe('/out/fixtures/data.json');
    // Subdirectories under the output directory stay legal (mock fixtures, split files).
    const registry = new Map([
      ['nested', { run: () => [{ path: '/out/fixtures/data.json', content: '{}' }] }],
    ]);
    expect(
      collectGeneratedFiles(model(), {
        outputPath: '/out/api.ts',
        outputMode: 'single',
        emit: {},
        generators: ['nested'],
        registry,
      })
    ).toHaveLength(1);
  });

  it('rejects a run() result that is not an array of { path, content } files', () => {
    for (const bad of [undefined, 'files', [{ path: '', content: 'x' }], [{ path: '/out/a' }]]) {
      const registry = new Map([['broken', { run: () => bad as never }]]);
      expect(() =>
        collectGeneratedFiles(model(), {
          outputPath: '/out/api.ts',
          outputMode: 'single',
          emit: {},
          generators: ['broken'],
          registry,
        })
      ).toThrow(/Generator "broken" failed: run\(\) must return/);
    }
  });

  it('supports runtime: package with outputMode: split (the shared emitter serves both)', () => {
    const files = collectGeneratedFiles(model(), {
      outputPath: '/out/api.ts',
      outputMode: 'split',
      emit: { runtime: 'package' },
      generators: ['typescript'],
    });
    // No schemas in the model → only the entry file.
    expect(files.map((f) => f.path)).toEqual(['/out/api.ts']);
    expect(files[0].content).toContain("from '@redocly/client-generator'");
  });
});

describe('generateClient — end-to-end orchestration', () => {
  let workDir: string;

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), 'client-gen-index-'));
  });

  afterEach(async () => {
    await rm(workDir, { recursive: true, force: true });
  });

  it('reports a parameter name used in two locations, which every SDK has to spell once', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const api = join(workDir, 'repeated.yaml');
    await writeFile(
      api,
      outdent`
        openapi: 3.1.0
        info: { title: Repeated, version: 1.0.0 }
        paths:
          /things/{id}:
            get:
              operationId: getThing
              parameters:
                - { name: id, in: path, required: true, schema: { type: string } }
                - { name: id, in: query, required: false, schema: { type: integer } }
              responses:
                '200':
                  description: OK
                  content:
                    application/json:
                      schema: { type: object }
      `,
      'utf-8'
    );
    await generateClient({ api, output: join(workDir, 'client.ts') });
    expect(warn.mock.calls.map(([message]) => message).join('\n')).toContain(
      'operation "getThing" uses "id" in more than one parameter location'
    );
    warn.mockRestore();
  });

  it('writes the generated file to disk and reports its size', async () => {
    const api = join(workDir, 'spec.yaml');
    await writeFile(
      api,
      outdent`
        openapi: 3.0.3
        info:
          title: Tiny
          version: 1.0.0
        paths:
          /ping:
            get:
              operationId: ping
              responses:
                '200':
                  description: OK
                  content:
                    application/json:
                      schema: { type: string }
      `,
      'utf-8'
    );

    const output = join(workDir, 'nested/dir/api.ts');
    const result = await generateClient({ api, output });

    expect(result.outputPath).toBe(output);
    expect(result.bytes).toBeGreaterThan(0);

    const contents = await readFile(output, 'utf-8');
    expect(contents).toContain('export const { ping } = client;');
    expect(contents).toContain('// Generated by @redocly/client-generator');
    // bytes should match what we wrote.
    expect(result.bytes).toBe(Buffer.byteLength(contents, 'utf-8'));
  });

  it('emits the result shape when errorMode is `result`', async () => {
    const api = join(workDir, 'errmode.yaml');
    await writeFile(
      api,
      outdent`
        openapi: 3.0.3
        info:
          title: Tiny
          version: 1.0.0
        paths:
          /ping:
            get:
              operationId: ping
              responses:
                '200':
                  description: OK
                  content:
                    application/json:
                      schema: { type: string }
      `,
      'utf-8'
    );

    const resultOutput = join(workDir, 'result.ts');
    await generateClient({ api, output: resultOutput, errorMode: 'result' });
    const resultContents = await readFile(resultOutput, 'utf-8');
    expect(resultContents).toContain('errorMode: "result"');
    expect(resultContents).toContain('result: Result<PingResult, unknown>;');

    const throwOutput = join(workDir, 'throw.ts');
    await generateClient({ api, output: throwOutput });
    const throwContents = await readFile(throwOutput, 'utf-8');
    expect(throwContents).not.toContain('errorMode: "result"');
    expect(throwContents).toContain('result: PingResult;');
  });

  it('passes the pagination config through to the emitter', async () => {
    const api = join(workDir, 'paginated.yaml');
    await writeFile(
      api,
      outdent`
        openapi: 3.0.3
        info:
          title: Cafe
          version: 1.0.0
        paths:
          /orders:
            get:
              operationId: listOrders
              parameters:
                - { name: cursor, in: query, schema: { type: string } }
              responses:
                '200':
                  description: OK
                  content:
                    application/json:
                      schema:
                        type: object
                        properties:
                          orders:
                            type: array
                            items: { type: string }
                          nextCursor: { type: string }
      `,
      'utf-8'
    );

    const output = join(workDir, 'paginated.ts');
    await generateClient({
      api,
      output,
      pagination: {
        style: 'cursor',
        cursorParam: 'cursor',
        nextCursor: '/nextCursor',
        items: '/orders',
      },
    });
    const contents = await readFile(output, 'utf-8');
    expect(contents).toContain(
      'pagination: { style: "cursor", param: "cursor", nextCursor: "/nextCursor", items: "/orders" }'
    );
    expect(contents).toContain('item: string;');
    // `.pages`/`.items` ride the client method the binding points at.
    expect(contents).toContain('export const { listOrders } = client;');
  });

  it('normalizes a Swagger 2.0 document before generating', async () => {
    const api = join(workDir, 'swagger2.yaml');
    await writeFile(
      api,
      outdent`
        swagger: '2.0'
        info:
          title: Tiny2
          version: 1.0.0
        host: api.example.com
        basePath: /v1
        schemes: [https]
        consumes: [application/json]
        produces: [application/json]
        paths:
          /items:
            get:
              operationId: listItems
              parameters:
                - { name: page, in: query, required: false, type: integer }
              responses:
                '200':
                  description: ok
                  schema: { $ref: '#/definitions/Item' }
        definitions:
          Item:
            type: object
            properties:
              id: { type: integer }
      `,
      'utf-8'
    );

    const output = join(workDir, 'api2.ts');
    const result = await generateClient({ api, output });

    expect(result.bytes).toBeGreaterThan(0);
    const contents = await readFile(output, 'utf-8');
    expect(contents).toContain('export const { listItems } = client;');
    expect(contents).toContain('export type Item');
    expect(contents).toContain('serverUrl: "https://api.example.com/v1"');
  });
});

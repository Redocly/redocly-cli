import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { outdent } from 'outdent';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');
const cli = join(repoRoot, 'packages/cli/lib/index.js');
const tscBin = join(repoRoot, 'node_modules/.bin/tsc');
// `zod` is hoisted to the repo root node_modules (a repo devDependency); map it
// explicitly so tsc resolves `import { z } from 'zod'` from the out-of-tree temp dir.
const zodPath = join(repoRoot, 'node_modules/zod');

describe('generate-client zod generator', () => {
  it('emits a *.zod.ts module that strict-tsc-checks against real zod and agrees with the sdk types', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ots-zod-'));
    const out = join(dir, 'client.ts');
    const zodOut = join(dir, 'client.zod.ts');

    const res = spawnSync(
      'node',
      [
        cli,
        'generate-client',
        join(__dirname, 'fixtures', 'cafe.yaml'),
        '--output',
        out,
        '--generator',
        'sdk',
        '--generator',
        'zod',
      ],
      { encoding: 'utf-8', cwd: repoRoot }
    );
    expect(res.status, res.stderr).toBe(0);

    // Both the sdk client and the standalone zod module are produced.
    expect(existsSync(out)).toBe(true);
    expect(existsSync(zodOut)).toBe(true);

    const zodSource = readFileSync(zodOut, 'utf-8');
    expect(zodSource).toContain('import { z } from "zod"');
    expect(zodSource).toContain('export const PageSchema = z.object(');

    // z.infer<typeof PageSchema> must be assignable to the sdk's Page type
    // (schema ↔ type agreement). For `Page` (all-required scalars) the
    // assignability is in fact bidirectional; we assert the z.infer → sdk
    // direction, which is the one the schema is expected to guarantee.
    writeFileSync(
      join(dir, 'check.ts'),
      [
        "import type { z } from 'zod';",
        "import type { Page } from './client.js';",
        "import type { PageSchema } from './client.zod.js';",
        'const _x: Page = {} as z.infer<typeof PageSchema>;',
        'void _x;',
        '',
      ].join('\n'),
      'utf-8'
    );

    // strict-tsc the whole temp project: the emitted zod module against REAL
    // zod, plus the schema ↔ type agreement check.
    writeFileSync(
      join(dir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          module: 'nodenext',
          moduleResolution: 'nodenext',
          target: 'es2022',
          lib: ['ES2022', 'DOM'],
          strict: true,
          noEmit: true,
          skipLibCheck: true,
          types: [],
          paths: { zod: [zodPath] },
        },
        include: ['client.ts', 'client.zod.ts', 'check.ts'],
      }),
      'utf-8'
    );

    const tsc = spawnSync(tscBin, ['--noEmit', '-p', dir], { encoding: 'utf-8', cwd: repoRoot });
    expect(tsc.status, `tsc failed:\n${tsc.stdout}\n${tsc.stderr}`).toBe(0);

    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('zodValidation middleware validates requests before the wire and JSON responses after it', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ots-zod-run-'));
    writeFileSync(join(dir, 'package.json'), '{"name":"zod-run","private":true,"type":"module"}\n');
    mkdirSync(join(dir, 'node_modules'), { recursive: true });
    symlinkSync(zodPath, join(dir, 'node_modules/zod'));
    writeFileSync(
      join(dir, 'openapi.yaml'),
      outdent`
        openapi: 3.0.3
        info: { title: test, version: 1.0.0 }
        paths:
          /orders:
            post:
              operationId: createOrder
              requestBody:
                required: true
                content:
                  application/json:
                    schema:
                      $ref: '#/components/schemas/OrderInput'
              responses:
                '200':
                  description: ok
                  content:
                    application/json:
                      schema:
                        type: object
                        required: [id]
                        properties:
                          id: { type: string }
          /health:
            get:
              operationId: health
              responses:
                '204': { description: no content }
        components:
          schemas:
            OrderBase:
              type: object
              properties:
                id: { type: string, readOnly: true }
            OrderInput:
              # allOf with a readOnly field: the derived request schema must distribute
              # the omission into the intersection members (ZodIntersection has no .omit).
              allOf:
                - $ref: '#/components/schemas/OrderBase'
                - type: object
                  required: [name, quantity]
                  properties:
                    name: { type: string }
                    quantity: { type: integer, minimum: 1 }
      `
    );
    const generated = spawnSync(
      'node',
      [
        cli,
        'generate-client',
        'openapi.yaml',
        '--output',
        'client.ts',
        '--generator',
        'sdk',
        '--generator',
        'zod',
      ],
      { cwd: dir, encoding: 'utf-8' }
    );
    expect(generated.status, generated.stderr).toBe(0);

    writeFileSync(
      join(dir, 'driver.ts'),
      outdent`
        import { client, configure, use } from './client.js';
        import { operationSchemas, zodValidation, ZodValidationError } from './client.zod.js';

        const results: string[] = [];
        let fetchCalls = 0;
        let nextBody = '{"id":"o1"}';
        let nextStatus = 200;
        configure({
          serverUrl: 'https://api.example.com',
          fetch: async () => {
            fetchCalls++;
            return new Response(nextStatus === 204 ? null : nextBody, {
              status: nextStatus,
              headers: nextStatus === 204 ? {} : { 'content-type': 'application/json' },
            });
          },
        });

        async function main() {
          // Direct schema access: the map is importable on its own.
          operationSchemas.createOrder.request.parse({ name: 'direct', quantity: 2 });

          use(zodValidation({ response: false }));

          // An invalid request throws BEFORE any network call.
          try {
            await client.createOrder({ body: { name: 'x', quantity: 0 } });
            results.push('request-not-validated');
          } catch (error) {
            results.push(
              error instanceof ZodValidationError
                ? 'request-rejected:' + error.direction + ':calls=' + fetchCalls
                : 'wrong-error:' + String(error)
            );
          }

          // With response validation off, a mismatched response resolves untouched.
          nextBody = '{"wrong":true}';
          await client.createOrder({ body: { name: 'x', quantity: 2 } });
          results.push('response-off-passes');

          // A second middleware turns response validation on; the mismatch now throws.
          use(zodValidation({ request: false }));
          try {
            await client.createOrder({ body: { name: 'x', quantity: 2 } });
            results.push('response-not-validated');
          } catch (error) {
            results.push(
              error instanceof ZodValidationError
                ? 'response-rejected:' + error.direction
                : 'wrong-error:' + String(error)
            );
          }

          // A valid round trip passes both directions; a schema-less operation is untouched.
          nextBody = '{"id":"o2"}';
          const order = await client.createOrder({ body: { name: 'ok', quantity: 3 } });
          results.push('valid:' + order.id);
          nextStatus = 204;
          await client.health();
          results.push('schema-less-ok');

          console.log(JSON.stringify(results));
        }
        // An unhandled rejection exits non-zero, so a driver failure fails the test.
        void main();
      `
    );
    writeFileSync(
      join(dir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          module: 'nodenext',
          moduleResolution: 'nodenext',
          target: 'es2022',
          lib: ['ES2022', 'DOM'],
          strict: true,
          skipLibCheck: true,
          types: [],
          declaration: true,
        },
        include: ['client.ts', 'client.zod.ts', 'driver.ts'],
      }),
      'utf-8'
    );
    const tsc = spawnSync(tscBin, ['-p', dir], { encoding: 'utf-8', cwd: dir });
    expect(tsc.status, `tsc failed:\n${tsc.stdout}\n${tsc.stderr}`).toBe(0);

    const run = spawnSync('node', ['driver.js'], { cwd: dir, encoding: 'utf-8' });
    expect(run.status, run.stderr).toBe(0);
    expect(JSON.parse(run.stdout)).toEqual([
      'request-rejected:request:calls=0',
      'response-off-passes',
      'response-rejected:response',
      'valid:o2',
      'schema-less-ok',
    ]);
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);
});

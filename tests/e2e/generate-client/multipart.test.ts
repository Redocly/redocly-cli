/**
 * Behavioral e2e for typed multipart bodies (#5): the generated client takes a typed object
 * and serializes it to `FormData` via the runtime's multipart capability — binary→Blob,
 * arrays→repeated fields, objects→JSON parts. We inject a fake `fetch` and inspect the
 * FormData it actually sent.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { outdent } from 'outdent';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');
const cli = join(repoRoot, 'packages/cli/lib/index.js');
const tsxBin = join(repoRoot, 'node_modules/.bin/tsx');
const tscBin = join(repoRoot, 'node_modules/.bin/tsc');

function collectTsFiles(d: string): string[] {
  return readdirSync(d).flatMap((e) => {
    const full = join(d, e);
    return statSync(full).isDirectory() ? collectTsFiles(full) : full.endsWith('.ts') ? [full] : [];
  });
}

const SPEC = outdent`
  openapi: 3.1.0
  info: { title: M, version: 1.0.0 }
  paths:
    /upload:
      post:
        operationId: upload
        requestBody:
          required: true
          content:
            multipart/form-data:
              schema:
                type: object
                required: [file, orgId]
                properties:
                  file: { type: string, format: binary }
                  orgId: { type: string }
                  tags: { type: array, items: { type: string } }
                  meta: { type: object }
        responses: { '200': { description: ok } }
`;

describe('generate-client typed multipart body (#5)', () => {
  let dir = '';
  afterEach(() => {
    if (dir && existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  });

  it('types the fields (binary→Blob) and serializes the object to FormData', () => {
    dir = mkdtempSync(join(tmpdir(), 'ots-multipart-'));
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ type: 'module' }), 'utf-8');
    writeFileSync(join(dir, 'api.yaml'), SPEC, 'utf-8');
    const out = join(dir, 'client.ts');
    const gen = spawnSync(
      'node',
      [cli, 'generate-client', join(dir, 'api.yaml'), '--output', out],
      {
        encoding: 'utf-8',
        cwd: repoRoot,
      }
    );
    expect(gen.status, gen.stderr).toBe(0);

    writeFileSync(
      join(dir, 'consumer.ts'),
      outdent`
        import { configure, upload } from './client.ts';

        let body: unknown;
        configure({
          fetch: (async (_url: string, init: RequestInit) => {
            body = init.body;
            return new Response('', { status: 200 });
          }) as unknown as typeof fetch,
        });

        const file = new Blob(['hello'], { type: 'text/plain' });
        await upload({ file, orgId: 'org_1', tags: ['a', 'b'], meta: { k: 'v' } });

        const fd = body as FormData;
        console.log(JSON.stringify({
          isFormData: fd instanceof FormData,
          orgId: fd.get('orgId'),
          fileIsBlob: fd.get('file') instanceof Blob,
          tags: fd.getAll('tags'),
          meta: fd.get('meta'),
        }));
      `,
      'utf-8'
    );
    const run = spawnSync(tsxBin, [join(dir, 'consumer.ts')], { encoding: 'utf-8', cwd: repoRoot });
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0);
    const result = JSON.parse(run.stdout.trim()) as Record<string, unknown>;

    expect(result.isFormData).toBe(true);
    expect(result.orgId).toBe('org_1');
    expect(result.fileIsBlob).toBe(true);
    expect(result.tags).toEqual(['a', 'b']); // array → one field per item
    expect(result.meta).toBe('{"k":"v"}'); // nested object → JSON part
  }, 60_000);

  it('serializes the multipart body AFTER onRequest, so middleware can mutate it', () => {
    dir = mkdtempSync(join(tmpdir(), 'ots-multipart-mw-'));
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ type: 'module' }), 'utf-8');
    writeFileSync(join(dir, 'api.yaml'), SPEC, 'utf-8');
    const out = join(dir, 'client.ts');
    const gen = spawnSync(
      'node',
      [cli, 'generate-client', join(dir, 'api.yaml'), '--output', out],
      {
        encoding: 'utf-8',
        cwd: repoRoot,
      }
    );
    expect(gen.status, gen.stderr).toBe(0);

    writeFileSync(
      join(dir, 'consumer.ts'),
      outdent`
        import { configure, use, upload } from './client.ts';

        let body: unknown;
        configure({
          fetch: (async (_url: string, init: RequestInit) => {
            body = init.body;
            return new Response('', { status: 200 });
          }) as unknown as typeof fetch,
        });
        // A multipart op must expose the plain body object to onRequest (not pre-built FormData);
        // mutating it has to be reflected in the FormData the runtime serializes afterwards.
        use({ onRequest: (ctx) => { (ctx.body as { orgId: string }).orgId = 'mutated'; } });

        const file = new Blob(['hi'], { type: 'text/plain' });
        await upload({ file, orgId: 'org_1' });

        const fd = body as FormData;
        console.log(JSON.stringify({ isFormData: fd instanceof FormData, orgId: fd.get('orgId') }));
      `,
      'utf-8'
    );
    const run = spawnSync(tsxBin, [join(dir, 'consumer.ts')], { encoding: 'utf-8', cwd: repoRoot });
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0);
    const result = JSON.parse(run.stdout.trim()) as Record<string, unknown>;

    expect(result.isFormData).toBe(true);
    expect(result.orgId).toBe('mutated');
  }, 60_000);

  it('compiles in split output (multipart serialization lives in the embedded runtime)', () => {
    dir = mkdtempSync(join(tmpdir(), 'ots-multipart-split-'));
    writeFileSync(join(dir, 'api.yaml'), SPEC, 'utf-8');
    const gen = spawnSync(
      'node',
      [
        cli,
        'generate-client',
        join(dir, 'api.yaml'),
        '--output',
        join(dir, 'client.ts'),
        '--output-mode',
        'split',
      ],
      { encoding: 'utf-8', cwd: repoRoot }
    );
    expect(gen.status, gen.stderr).toBe(0);
    const files = collectTsFiles(dir);
    const tsc = spawnSync(
      tscBin,
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
      { encoding: 'utf-8', cwd: dir }
    );
    expect(tsc.status, `tsc failed:\n${tsc.stdout}\n${tsc.stderr}`).toBe(0);
  }, 60_000);
});

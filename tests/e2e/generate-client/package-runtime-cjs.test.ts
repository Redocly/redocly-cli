import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { outdent } from 'outdent';

import { cliEntry, repoRoot, tscBin } from './helpers.js';

// A CommonJS project (e.g. a NestJS backend) consuming a `runtime: package` client emits
// `require('@redocly/client-generator')`. That resolves through the `default` export
// condition and loads the ESM entry via Node's require(esm) — supported by every Node
// version the package's `engines` allow.

describe('generate-client package runtime in a CommonJS project', () => {
  it('require()s the generated client and completes a call', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ots-cjs-'));
    writeFileSync(join(dir, 'package.json'), '{"name":"cjs-consumer","private":true}\n');
    mkdirSync(join(dir, 'node_modules/@redocly'), { recursive: true });
    symlinkSync(
      join(repoRoot, 'packages/client-generator'),
      join(dir, 'node_modules/@redocly/client-generator')
    );
    writeFileSync(
      join(dir, 'openapi.yaml'),
      outdent`
        openapi: 3.0.3
        info: { title: test, version: 1.0.0 }
        paths:
          /foo:
            get:
              operationId: getFoo
              responses:
                '200':
                  description: ok
                  content:
                    application/json:
                      schema:
                        type: object
                        properties:
                          ok: { type: boolean }
      `
    );
    const generated = spawnSync(
      'node',
      [cliEntry, 'generate-client', 'openapi.yaml', '--output', 'api.ts', '--runtime', 'package'],
      { cwd: dir, encoding: 'utf-8' }
    );
    expect(generated.status, generated.stderr).toBe(0);

    const tsc = spawnSync(
      tscBin,
      [
        'api.ts',
        '--module',
        'nodenext',
        '--moduleResolution',
        'nodenext',
        '--target',
        'es2022',
        '--skipLibCheck',
      ],
      { cwd: dir, encoding: 'utf-8' }
    );
    expect(tsc.status, `tsc failed:\n${tsc.stdout}`).toBe(0);

    writeFileSync(
      join(dir, 'driver.cjs'),
      outdent`
        const { configure, getFoo } = require('./api.js');
        configure({
          serverUrl: 'https://api.example.com',
          fetch: async () =>
            new Response(JSON.stringify({ ok: true }), {
              status: 200,
              headers: { 'content-type': 'application/json' },
            }),
        });
        getFoo().then((data) => console.log('CJS-OK', JSON.stringify(data)));
      `
    );
    const run = spawnSync('node', ['driver.cjs'], { cwd: dir, encoding: 'utf-8' });
    expect(run.status, run.stderr).toBe(0);
    expect(run.stdout).toContain('CJS-OK {"ok":true}');
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);
});

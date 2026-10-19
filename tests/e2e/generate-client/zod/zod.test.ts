import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyConsumer, expectTscPasses, generate } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
describe('generate-client zod generator', () => {
  it('emits a *.zod.ts module that strict-tsc-checks against real zod and agrees with the sdk types', () => {
    const dir = copyConsumer(join(__dirname, 'consumer'));
    const out = join(dir, 'client.ts');
    const zodOut = join(dir, 'client.zod.ts');

    generate(join(__dirname, '../fixtures', 'cafe.yaml'), out, [
      '--generator',
      'typescript',
      '--generator',
      'zod',
    ]);

    // Both the sdk client and the standalone zod module are produced.
    expect(existsSync(out)).toBe(true);
    expect(existsSync(zodOut)).toBe(true);

    const zodSource = readFileSync(zodOut, 'utf-8');
    expect(zodSource).toContain('import { z } from "zod"');
    expect(zodSource).toContain('export const PageSchema = z.object(');

    // strict-tsc the emitted zod module against REAL zod, plus the schema ↔ type
    // agreement check in consumer/check.ts.
    expectTscPasses(['-p', join(dir, 'tsconfig.check.json')]);

    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('zodValidation middleware validates requests before the wire and JSON responses after it', () => {
    const dir = copyConsumer(join(__dirname, 'consumer'));
    generate(join(__dirname, 'orders.yaml'), join(dir, 'client.ts'), [
      '--generator',
      'typescript',
      '--generator',
      'zod',
    ]);

    expectTscPasses(['-p', join(dir, 'tsconfig.driver.json')], dir);

    const run = spawnSync('node', ['driver.js'], { cwd: dir, encoding: 'utf-8' });
    expect(run.status, run.stderr).toBe(0);
    expect(JSON.parse(run.stdout)).toEqual([
      'request-rejected:request:calls=0',
      'response-off-passes',
      'response-rejected:response',
      'valid:o2',
      'schema-less-ok',
      'warned:id',
      'warn-call-succeeded',
      'stripped:{"name":"s","quantity":1}',
    ]);
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);
});

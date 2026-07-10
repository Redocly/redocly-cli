import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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
});

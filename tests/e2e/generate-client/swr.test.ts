import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generate, repoRoot, tscBin } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// `swr` is hoisted to the repo root node_modules (a repo devDependency); map it
// explicitly so tsc resolves the generated module's `import useSWR from "swr"` and
// `import useSWRMutation from "swr/mutation"` from the temp dir.
const swrPath = join(repoRoot, 'node_modules/swr');

describe('generate-client swr generator', () => {
  it('emits a *.swr.ts module that strict-tsc-checks against real swr and composes with the sdk', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ots-swr-'));
    const out = join(dir, 'client.ts');
    const swrOut = join(dir, 'client.swr.ts');

    generate(join(__dirname, 'fixtures', 'base.yaml'), out, [
      '--generator',
      'sdk',
      '--generator',
      'swr',
    ]);

    // Both the sdk client and the standalone swr module are produced.
    expect(existsSync(out)).toBe(true);
    expect(existsSync(swrOut)).toBe(true);

    const source = readFileSync(swrOut, 'utf-8');
    expect(source).toContain('import useSWR from "swr"');
    expect(source).toContain('import useSWRMutation from "swr/mutation"');
    // A GET op (path param) → key factory + useSWR hook.
    expect(source).toContain('export const getPetByIdKey');
    expect(source).toContain('export function useGetPetById');
    expect(source).toContain('useSWR(');
    // A POST op → useSWRMutation hook.
    expect(source).toContain('export function useCreatePet');
    expect(source).toContain('useSWRMutation(');

    // strict-tsc the whole temp project: the emitted swr module against REAL swr,
    // plus the generated sdk client. The hooks are React hooks; type-checking the
    // module proves the emitted useSWR/useSWRMutation calls match swr's real API.
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
          jsx: 'react-jsx',
          types: [],
          paths: { swr: [swrPath], 'swr/*': [join(swrPath, '*')] },
        },
        include: ['client.ts', 'client.swr.ts'],
      }),
      'utf-8'
    );

    const tsc = spawnSync(tscBin, ['--noEmit', '-p', dir], { encoding: 'utf-8', cwd: repoRoot });
    expect(tsc.status, `tsc failed:\n${tsc.stdout}\n${tsc.stderr}`).toBe(0);

    rmSync(dir, { recursive: true, force: true });
  }, 60_000);
});

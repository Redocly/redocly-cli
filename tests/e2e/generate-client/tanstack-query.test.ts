import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generate, repoRoot, tscBin } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// The consumer dir holds the strict tsconfig and the `check*.ts` files that compose the
// generated factories with TanStack's real hooks; the generated modules land next to them.
const consumerDir = join(__dirname, 'tanstack-typecheck-consumer');
const GENERATED = ['client.ts', 'client.tanstack.ts', 'pagination.ts', 'pagination.tanstack.ts'];
const TANSTACK_ARGS = ['--generator', 'typescript', '--generator', 'tanstack-query'];

describe('generate-client tanstack-query generator', () => {
  beforeAll(() => {
    generate(
      join(__dirname, 'fixtures', 'base.yaml'),
      join(consumerDir, 'client.ts'),
      TANSTACK_ARGS
    );
    generate(
      join(__dirname, 'fixtures', 'pagination.yaml'),
      join(consumerDir, 'pagination.ts'),
      TANSTACK_ARGS
    );
  }, 60_000);

  afterAll(() => {
    for (const file of GENERATED) rmSync(join(consumerDir, file), { force: true });
  });

  it('emits a *.tanstack.ts module with query and mutation factories beside the sdk', () => {
    // Both the sdk client and the standalone tanstack module are produced.
    expect(existsSync(join(consumerDir, 'client.ts'))).toBe(true);
    expect(existsSync(join(consumerDir, 'client.tanstack.ts'))).toBe(true);

    const source = readFileSync(join(consumerDir, 'client.tanstack.ts'), 'utf-8');
    expect(source).toContain('import { queryOptions } from "@tanstack/react-query"');
    // A GET op (path param) → query factories.
    expect(source).toContain('export const getPetByIdQueryKey');
    expect(source).toContain('export const getPetByIdOptions');
    expect(source).toContain('queryOptions({');
    // A POST op → mutation factory.
    expect(source).toContain('export const createPetMutation');
    expect(source).toContain('mutationFn:');
  });

  it('emits InfiniteOptions for a body-link operation', () => {
    expect(readFileSync(join(consumerDir, 'pagination.tanstack.ts'), 'utf-8')).toContain(
      'export const listReceiptsInfiniteOptions'
    );
  });

  it('strict-tsc-checks the emitted modules against real @tanstack/react-query and composes them with the sdk', () => {
    // `check.ts` uses useQuery/useMutation, `check-pagination.ts` useInfiniteQuery: the
    // emitted factories type-check against the actual adapter surface, not in isolation.
    const tsc = spawnSync(tscBin, ['--noEmit', '-p', consumerDir], {
      encoding: 'utf-8',
      cwd: repoRoot,
    });
    expect(tsc.status, `tsc failed:\n${tsc.stdout}\n${tsc.stderr}`).toBe(0);
  }, 60_000);

  it('the tanstack-query-vue variant swaps only the import specifier to @tanstack/vue-query', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ots-tanstack-vue-'));
    const out = join(dir, 'client.ts');
    const tanstackOut = join(dir, 'client.tanstack.ts');

    generate(join(__dirname, 'fixtures', 'base.yaml'), out, [
      '--generator',
      'typescript',
      '--generator',
      'tanstack-query-vue',
    ]);

    // No strict-tsc compile here: @tanstack/vue-query isn't a dev dependency, and the
    // react test already proves the queryOptions output type-checks against a real
    // adapter — the only per-framework difference is this import string.
    const source = readFileSync(tanstackOut, 'utf-8');
    expect(source).toContain('import { queryOptions } from "@tanstack/vue-query"');
    expect(source).not.toContain('@tanstack/react-query');

    rmSync(dir, { recursive: true, force: true });
  }, 60_000);
});

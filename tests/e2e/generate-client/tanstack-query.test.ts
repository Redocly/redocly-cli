import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generate, repoRoot, tscBin } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// `@tanstack/react-query` is hoisted to the repo root node_modules (a repo
// devDependency); map it explicitly so tsc resolves the generated module's
// `import { queryOptions } from "@tanstack/react-query"` from the temp dir.
const tanstackPath = join(repoRoot, 'node_modules/@tanstack/react-query');
// The package-runtime case resolves the sdk's `@redocly/client-generator` import against the
// BUILT package types (the temp project lives outside the workspace, so no node_modules walk).
const generatorTypes = join(repoRoot, 'packages/client-generator/lib/index.d.ts');

describe('generate-client tanstack-query generator', () => {
  it('emits a *.tanstack.ts module that strict-tsc-checks against real @tanstack/react-query and composes with the sdk', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ots-tanstack-'));
    const out = join(dir, 'client.ts');
    const tanstackOut = join(dir, 'client.tanstack.ts');

    generate(join(__dirname, 'fixtures', 'base.yaml'), out, [
      '--generator',
      'sdk',
      '--generator',
      'tanstack-query',
    ]);

    // Both the sdk client and the standalone tanstack module are produced.
    expect(existsSync(out)).toBe(true);
    expect(existsSync(tanstackOut)).toBe(true);

    const source = readFileSync(tanstackOut, 'utf-8');
    expect(source).toContain('import { queryOptions } from "@tanstack/react-query"');
    // A GET op (path param) → query factories.
    expect(source).toContain('export const getPetByIdQueryKey');
    expect(source).toContain('export const getPetByIdOptions');
    expect(source).toContain('queryOptions({');
    // A POST op → mutation factory.
    expect(source).toContain('export const createPetMutation');
    expect(source).toContain('mutationFn:');

    // A consumer that composes the generated factories with TanStack's real
    // useQuery/useMutation types — proves the emitted hooks type-check against
    // the actual @tanstack/react-query API surface, not just in isolation.
    writeFileSync(
      join(dir, 'check.ts'),
      [
        "import { useMutation, useQuery } from '@tanstack/react-query';",
        "import { createPetMutation, getPetByIdOptions, listPetsOptions } from './client.tanstack.js';",
        'export function useGetPet(id: number) {',
        '  return useQuery(getPetByIdOptions({ id }));',
        '}',
        'export function useListPets() {',
        "  return useQuery(listPetsOptions({ params: { filter: { name: 'rex' } } }));",
        '}',
        'export function useCreatePet() {',
        '  return useMutation(createPetMutation());',
        '}',
        '',
      ].join('\n'),
      'utf-8'
    );

    // strict-tsc the whole temp project: the emitted tanstack module against
    // REAL @tanstack/react-query, plus the useQuery/useMutation composition.
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
          paths: { '@tanstack/react-query': [tanstackPath] },
        },
        include: ['client.ts', 'client.tanstack.ts', 'check.ts'],
      }),
      'utf-8'
    );

    const tsc = spawnSync(tscBin, ['--noEmit', '-p', dir], { encoding: 'utf-8', cwd: repoRoot });
    expect(tsc.status, `tsc failed:\n${tsc.stdout}\n${tsc.stderr}`).toBe(0);

    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('--runtime package: the tanstack wrapper composes with the package-runtime sdk and strict-tsc-checks', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ots-tanstack-pkg-'));
    const out = join(dir, 'client.ts');
    const tanstackOut = join(dir, 'client.tanstack.ts');

    generate(join(__dirname, 'fixtures', 'base.yaml'), out, [
      '--runtime',
      'package',
      '--generator',
      'sdk',
      '--generator',
      'tanstack-query',
      '--query-framework',
      'react',
    ]);

    // The sdk entry imports the runtime instead of embedding it; the wrapper is unchanged
    // in shape — it consumes the same free functions + <Op>Variables surface.
    const sdkSource = readFileSync(out, 'utf-8');
    expect(sdkSource).toContain("from '@redocly/client-generator'");
    expect(sdkSource).not.toContain('__send');
    const source = readFileSync(tanstackOut, 'utf-8');
    expect(source).toContain('import { queryOptions } from "@tanstack/react-query"');
    expect(source).toContain('export const getPetByIdOptions');
    expect(source).toContain('export const createPetMutation');

    // Same composition consumer as the inline case — the runtime choice must be
    // invisible to wrapper consumers.
    writeFileSync(
      join(dir, 'check.ts'),
      [
        "import { useMutation, useQuery } from '@tanstack/react-query';",
        "import { createPetMutation, getPetByIdOptions, listPetsOptions } from './client.tanstack.js';",
        'export function useGetPet(id: number) {',
        '  return useQuery(getPetByIdOptions({ id }));',
        '}',
        'export function useListPets() {',
        "  return useQuery(listPetsOptions({ params: { filter: { name: 'rex' } } }));",
        '}',
        'export function useCreatePet() {',
        '  return useMutation(createPetMutation());',
        '}',
        '',
      ].join('\n'),
      'utf-8'
    );

    // strict-tsc gate: the wrapper + the package-runtime sdk (resolved against the BUILT
    // @redocly/client-generator types) + the composition consumer, all in one project.
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
          paths: {
            '@tanstack/react-query': [tanstackPath],
            '@redocly/client-generator': [generatorTypes],
          },
        },
        include: ['client.ts', 'client.tanstack.ts', 'check.ts'],
      }),
      'utf-8'
    );

    const tsc = spawnSync(tscBin, ['--noEmit', '-p', dir], { encoding: 'utf-8', cwd: repoRoot });
    expect(tsc.status, `tsc failed:\n${tsc.stdout}\n${tsc.stderr}`).toBe(0);

    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('--query-framework vue swaps only the import specifier to @tanstack/vue-query', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ots-tanstack-vue-'));
    const out = join(dir, 'client.ts');
    const tanstackOut = join(dir, 'client.tanstack.ts');

    generate(join(__dirname, 'fixtures', 'base.yaml'), out, [
      '--generator',
      'sdk',
      '--generator',
      'tanstack-query',
      '--query-framework',
      'vue',
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

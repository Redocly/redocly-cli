/**
 * Behavioral e2e for the `mock` generator. We generate `typescript,mock` into a temp dir,
 * then run a real consumer (via tsx) that installs the emitted MSW handlers into
 * `setupServer` and calls a generated client operation whose native `fetch` MSW
 * intercepts. With `onUnhandledRequest: 'error'`, a resolved call proves interception
 * (an unmocked call would throw). The static response is deterministic (from the
 * sampler), so we assert exact field values.
 */

import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { outdent } from 'outdent';

import {
  expectTscPasses,
  generateInto,
  linkNodeModules,
  repoRoot,
  runConsumer,
} from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, 'fixtures/base.yaml');
// `@faker-js/faker` is hoisted to the repo root node_modules (a repo devDependency);
// map it explicitly so tsc resolves the faker-mode module's `import { faker }` from the temp dir.
const fakerPath = join(repoRoot, 'node_modules/@faker-js/faker');
// A date-bearing fixture for the `--date-type Date` regression (mock + transformers).
const dateFixture = join(__dirname, 'fixtures/transformers.yaml');

describe('mock generator — generated client through MSW', () => {
  let dir = '';
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'mock-consumer-'));
    linkNodeModules(dir);
    generateInto(dir, fixture, ['--generator', 'typescript', '--generator', 'mock']);
  }, 60_000);
  afterAll(() => {
    if (dir && existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  });

  test('emits a sibling client.mocks.ts', () => {
    expect(existsSync(join(dir, 'client.mocks.ts'))).toBe(true);
  });

  test('handlers installed in setupServer intercept the generated fetch and return static data', () => {
    const result = runConsumer(
      dir,
      outdent`
        import { setupServer } from 'msw/node';
        import { handlers } from './client.mocks.ts';
        import { configure, getPetById } from './client.ts';

        const server = setupServer(...handlers);
        server.listen({ onUnhandledRequest: 'error' });
        configure({ serverUrl: 'https://api.example.com' });
        try {
          const pet = await getPetById({ path: { id: 1 } });
          process.stdout.write(JSON.stringify({ ok: pet !== undefined, id: pet.id, name: pet.name }));
        } finally {
          server.close();
        }
      `
    ) as { ok: boolean; id: number; name: string };

    // Deterministic sampler output for the Pet schema in base.yaml.
    expect(result.ok).toBe(true);
    expect(result.id).toBe(0);
    expect(result.name).toBe('string');
  }, 60_000);

  test('the generated client + mocks type-check together under strict mode', () => {
    expect(existsSync(join(dir, 'client.mocks.ts')), 'generation must run first').toBe(true);

    expectTscPasses(
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
        join(dir, 'client.ts'),
        join(dir, 'client.mocks.ts'),
      ],
      dir
    );
  }, 90_000);
});

describe('mock generator — mock + transformers + --date-type Date compile together', () => {
  let dir = '';
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'mock-date-'));
    linkNodeModules(dir);
    // transformers REQUIRES --date-type Date; the sdk then types date fields `Date`,
    // so the mock sampler must bake `new Date(...)` to type-check (BUG 1 regression).
    generateInto(dir, dateFixture, [
      '--generator',
      'typescript',
      '--generator',
      'mock',
      '--generator',
      'transformers',
      '--date-type',
      'Date',
    ]);
  }, 60_000);
  afterAll(() => {
    if (dir && existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  });

  test('strict-tsc-checks client + mocks + transformers together with 0 errors', () => {
    expect(existsSync(join(dir, 'client.mocks.ts')), 'generation must run first').toBe(true);

    expectTscPasses(
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
        join(dir, 'client.ts'),
        join(dir, 'client.mocks.ts'),
        join(dir, 'client.transformers.ts'),
      ],
      dir
    );
  }, 90_000);
});

describe('mock generator — faker mode strict-tsc-checks against real @faker-js/faker', () => {
  let dir = '';
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'mock-faker-'));
    linkNodeModules(dir);
    generateInto(dir, fixture, [
      '--generator',
      'typescript',
      '--generator',
      'mock',
      '--mock-data',
      'faker',
      '--mock-seed',
      '42',
    ]);
  }, 60_000);
  afterAll(() => {
    if (dir && existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  });

  test('emits the faker import, faker calls, and a seed pin', () => {
    const source = readFileSync(join(dir, 'client.mocks.ts'), 'utf-8');
    expect(source).toContain("import { faker } from '@faker-js/faker';");
    expect(source).toMatch(/faker\.(number|lorem|datatype|string|internet|helpers)\./);
    expect(source).toContain('faker.seed(42);');
  });

  test('the faker-mode client + mocks strict-tsc-check against real faker with 0 errors', () => {
    expect(existsSync(join(dir, 'client.mocks.ts')), 'generation must run first').toBe(true);

    // A tsconfig whose `paths` maps `@faker-js/faker` to the
    // hoisted package — type-checking the emitted faker calls against faker's real v9 API.
    writeFileSync(
      join(dir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          module: 'esnext',
          moduleResolution: 'bundler',
          target: 'ES2020',
          lib: ['ES2020', 'DOM'],
          strict: true,
          noEmit: true,
          skipLibCheck: true,
          types: [],
          paths: {
            '@faker-js/faker': [fakerPath],
            '@faker-js/faker/*': [join(fakerPath, '*')],
          },
        },
        include: ['client.ts', 'client.mocks.ts'],
      }),
      'utf-8'
    );

    expectTscPasses(['--noEmit', '-p', dir], dir);
  });
});

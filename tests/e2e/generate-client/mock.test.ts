/**
 * Behavioral e2e for the `mock` generator. We generate `typescript,mock` into a temp dir,
 * then run a real consumer (via tsx) that installs the emitted MSW handlers into
 * `setupServer` and calls a generated client operation whose native `fetch` MSW
 * intercepts. With `onUnhandledRequest: 'error'`, a resolved call proves interception
 * (an unmocked call would throw). The static response is deterministic (from the
 * sampler), so we assert exact field values.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { outdent } from 'outdent';

import { generateInto, repoRoot, runConsumer, tscBin } from './helpers.js';

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
    // The consumer imports `msw` (a hoisted repo dep). Node ESM resolves modules
    // relative to the importing file, so the temp dir must live inside the repo
    // tree to walk up to the root node_modules — `os.tmpdir()` would not resolve it.
    dir = mkdtempSync(join(__dirname, 'mock-consumer-'));
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

    const tsc = spawnSync(
      tscBin,
      [
        '--noEmit',
        '--strict',
        // The temp dir lives inside the repo tree (so `msw` resolves), which puts the
        // repo's own tsconfig.json on the upward search path; ignore it and type-check
        // purely from these flags.
        '--ignoreConfig',
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
      { encoding: 'utf-8', cwd: dir }
    );
    expect(tsc.status, `tsc errors:\n${tsc.stdout}\n${tsc.stderr}`).toBe(0);
  }, 90_000);
});

describe('mock generator — mock + transformers + --date-type Date compile together', () => {
  let dir = '';
  beforeAll(() => {
    dir = mkdtempSync(join(__dirname, 'mock-date-'));
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

    const tsc = spawnSync(
      tscBin,
      [
        '--noEmit',
        '--strict',
        '--ignoreConfig',
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
      { encoding: 'utf-8', cwd: dir }
    );
    expect(tsc.status, `tsc errors:\n${tsc.stdout}\n${tsc.stderr}`).toBe(0);
  }, 90_000);
});

describe('mock generator — faker mode strict-tsc-checks against real @faker-js/faker', () => {
  let dir = '';
  beforeAll(() => {
    dir = mkdtempSync(join(__dirname, 'mock-faker-'));
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

    // A real-tsconfig run (not `--ignoreConfig`) so `paths` maps `@faker-js/faker` to the
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

    const tsc = spawnSync(tscBin, ['--noEmit', '-p', dir], { encoding: 'utf-8', cwd: dir });
    expect(tsc.status, `tsc errors:\n${tsc.stdout}\n${tsc.stderr}`).toBe(0);
  }, 90_000);
});

describe('mock generator — the mocks satisfy the zod schemas of the same description', () => {
  const dirs: string[] = [];
  afterAll(() => {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
  });

  // Every factory that has a zod schema of the same name, and every operation's default
  // handler (fetched through MSW), must pass validation. Prints the failures as JSON.
  const checkMocks = outdent`
    import { setupServer } from 'msw/node';
    import * as mocks from './client.mocks.ts';
    import * as zod from './client.zod.ts';
    import { OPERATIONS } from './client.ts';

    type Schema = { safeParse(value: unknown): { success: boolean; error?: { message: string } } };
    const failures: string[] = [];
    const record = (label: string, schema: Schema, value: unknown) => {
      const result = schema.safeParse(value);
      if (!result.success) failures.push(\`\${label}: \${result.error?.message}\`);
    };
    for (const [name, factory] of Object.entries(mocks)) {
      const schema = (zod as Record<string, unknown>)[\`\${name.replace(/^create/, '')}Schema\`];
      if (name.startsWith('create') && schema) record(name, schema as Schema, (factory as () => unknown)());
    }
    const server = setupServer(...mocks.handlers);
    server.listen({ onUnhandledRequest: 'error' });
    for (const [id, operation] of Object.entries(OPERATIONS)) {
      const schema = (zod.operationSchemas as Record<string, { response?: Schema }>)[id]?.response;
      if (!schema) continue;
      const path = operation.path.replace(/\\{[^}]+\\}/g, '1');
      const response = await fetch(\`https://api.example.com\${path}\`, { method: operation.method });
      record(\`\${id}Handler\`, schema, await response.json());
    }
    server.close();
    process.stdout.write(JSON.stringify(failures));
  `;

  test.each(['cafe.yaml', 'base.yaml', 'pagination.yaml'])(
    '%s: factories and default handlers pass validation',
    (name) => {
      const dir = mkdtempSync(join(__dirname, 'mock-valid-'));
      dirs.push(dir);
      generateInto(dir, join(__dirname, 'fixtures', name), [
        '--generator',
        'typescript',
        '--generator',
        'zod',
        '--generator',
        'mock',
      ]);
      expect(runConsumer(dir, checkMocks)).toEqual([]);
    },
    60_000
  );

  test('pages() over the default cursor handler yields exactly one page', () => {
    const dir = mkdtempSync(join(__dirname, 'mock-pages-'));
    dirs.push(dir);
    generateInto(dir, join(__dirname, 'fixtures/pagination.yaml'), [
      '--generator',
      'typescript',
      '--generator',
      'mock',
    ]);
    const pages = runConsumer(
      dir,
      outdent`
        import { setupServer } from 'msw/node';
        import { handlers } from './client.mocks.ts';
        import { client } from './client.ts';

        const server = setupServer(...handlers);
        server.listen({ onUnhandledRequest: 'error' });
        client.configure({ serverUrl: 'https://api.example.com' });
        let pages = 0;
        for await (const _page of client.listOrders.pages()) pages++;
        server.close();
        process.stdout.write(JSON.stringify(pages));
      `
    );
    expect(pages).toBe(1);
  }, 60_000);
});

/**
 * Tests the `mock` generator. We generate `typescript,mock` into a temp dir,
 * then run a real consumer (via tsx) that installs the emitted MSW handlers into
 * `setupServer` and calls a generated client operation whose native `fetch` MSW
 * intercepts. With `onUnhandledRequest: 'error'`, a resolved call proves interception
 * (an unmocked call would throw). The static response is deterministic (from the
 * sampler), so we assert exact field values.
 */

import { generateClient } from '@redocly/client-generator';
import { readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  copyConsumer,
  expectTscPasses,
  runConsumer,
  strictTypecheck,
} from '../../helpers/helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, '../../fixtures/base.yaml');
// A date-bearing fixture for the `dateType: 'Date'` case (mock + transformers).
const dateFixture = join(__dirname, '../../fixtures/transformers.yaml');

describe('mock generator — generated client through MSW', () => {
  let dir = '';
  beforeAll(async () => {
    dir = copyConsumer(join(__dirname, 'consumer'));
    await generateClient({
      api: fixture,
      output: join(dir, 'client.ts'),
      generators: ['typescript', 'mock'],
    });
  }, 60_000);
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test('handlers installed in setupServer intercept the generated fetch and return static data', async () => {
    const result = (await runConsumer(join(dir, 'msw-handlers.ts'))) as {
      ok: boolean;
      id: number;
      name: string;
    };

    // Deterministic sampler output for the Pet schema in base.yaml.
    expect(result.ok).toBe(true);
    expect(result.id).toBe(0);
    expect(result.name).toBe('string');
  }, 60_000);

  test('the generated client + mocks type-check together under strict mode', () => {
    strictTypecheck(dir, ['client.ts', 'client.mocks.ts']);
  }, 90_000);
});

describe("mock generator — mock + transformers + dateType: 'Date' compile together", () => {
  let dir = '';
  beforeAll(async () => {
    dir = copyConsumer(join(__dirname, 'consumer'));
    // transformers REQUIRES `dateType: 'Date'`; the sdk then types date fields `Date`,
    // so the mock sampler must bake `new Date(...)` to type-check.
    await generateClient({
      api: dateFixture,
      output: join(dir, 'client.ts'),
      generators: ['typescript', 'mock', 'transformers'],
      dateType: 'Date',
    });
  }, 60_000);
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test('strict-tsc-checks client + mocks + transformers together with 0 errors', () => {
    strictTypecheck(dir, ['client.ts', 'client.mocks.ts', 'client.transformers.ts']);
  }, 90_000);
});

describe('mock generator — faker mode strict-tsc-checks against real @faker-js/faker', () => {
  let dir = '';
  beforeAll(async () => {
    dir = copyConsumer(join(__dirname, 'consumer'));
    await generateClient({
      api: fixture,
      output: join(dir, 'client.ts'),
      generators: ['typescript', 'mock'],
      mockData: 'faker',
      mockSeed: 42,
    });
  }, 60_000);
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test('emits the faker import, faker calls, and a seed pin', () => {
    const source = readFileSync(join(dir, 'client.mocks.ts'), 'utf-8');
    expect(source).toContain("import { faker } from '@faker-js/faker';");
    expect(source).toMatch(/faker\.(number|lorem|datatype|string|internet|helpers)\./);
    expect(source).toContain('faker.seed(42);');
  });

  test('the faker-mode client + mocks strict-tsc-check against real faker with 0 errors', () => {
    // tsconfig.faker.json checks the faker calls against the real @faker-js/faker,
    // which resolves through the linked node_modules.
    expectTscPasses(['-p', join(dir, 'tsconfig.faker.json')], dir);
  });
});

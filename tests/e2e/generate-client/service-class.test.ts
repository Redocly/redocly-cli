/**
 * E2E for `--facade service-class`: the emitted class-shaped client must compile
 * under strict `tsc` with `--noUnusedLocals` (proving the hoisted aliases, method
 * signatures, and runtime references are all sound), across every output mode.
 *
 * Uses cafe.yaml because it exercises auth, header params, named types, and
 * discriminated-union guards — the same surface the functions facade is tested on.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');
const cliEntry = join(repoRoot, 'packages/cli/lib/index.js');
const fixture = join(__dirname, 'fixtures/cafe.yaml');

const TSC_ARGS = [
  '--noEmit',
  '--strict',
  '--noUnusedLocals',
  '--target',
  'ES2020',
  '--module',
  'esnext',
  '--moduleResolution',
  'bundler',
  '--lib',
  'ES2020,DOM',
];

function collectTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectTsFiles(full));
    else if (entry.endsWith('.ts')) out.push(full);
  }
  return out;
}

describe('generate-client end-to-end (--facade service-class, --output-mode single)', () => {
  let workDir = '';
  let entry = '';

  beforeAll(() => {
    workDir = mkdtempSync(join(tmpdir(), 'sc-single-client-'));
    entry = join(workDir, 'client.ts');
  });

  afterAll(() => {
    if (workDir && existsSync(workDir)) rmSync(workDir, { recursive: true, force: true });
  });

  test('emits one named Client class with the operations as methods', () => {
    const result = spawnSync(
      'node',
      [
        cliEntry,
        'generate-client',
        fixture,
        '--output',
        entry,
        '--facade',
        'service-class',
        '--name',
        'CafeClient',
      ],
      { encoding: 'utf-8', cwd: repoRoot }
    );
    expect(result.status, `generate-client stderr:\n${result.stderr}`).toBe(0);
    expect(existsSync(entry)).toBe(true);

    const src = readFileSync(entry, 'utf-8');
    expect(src).toContain('export class CafeClient {');
    expect(src).not.toContain('export async function');
    // Methods live inside the class, bodies still call the shared runtime.
    expect(src).toMatch(/\basync \w+\(/);
    expect(src).toMatch(/return __request<[^>]*>\(this\.config,/);
    // Operation aliases are hoisted to module level, ahead of the class.
    expect(src).toMatch(/export type \w+Result/);
    expect(src.search(/export type \w+Result/)).toBeLessThan(
      src.indexOf('export class CafeClient {')
    );
  }, 90_000);

  test('the class-shaped client type-checks under strict mode with no unused locals', () => {
    expect(existsSync(entry), 'generation test must run first').toBe(true);
    const tscBin = join(repoRoot, 'node_modules/.bin/tsc');
    const tsc = spawnSync(tscBin, [...TSC_ARGS, ...collectTsFiles(workDir)], {
      encoding: 'utf-8',
      cwd: workDir,
    });
    expect(tsc.status, `tsc errors:\n${tsc.stdout}\n${tsc.stderr}`).toBe(0);
  }, 90_000);
});

describe('generate-client end-to-end (--facade service-class, --output-mode split)', () => {
  let workDir = '';
  let entry = '';

  beforeAll(() => {
    workDir = mkdtempSync(join(tmpdir(), 'sc-split-client-'));
    entry = join(workDir, 'client.ts');
  });

  afterAll(() => {
    if (workDir && existsSync(workDir)) rmSync(workDir, { recursive: true, force: true });
  });

  test('places the Client class in the entry beside the shared http + schemas modules', () => {
    const result = spawnSync(
      'node',
      [
        cliEntry,
        'generate-client',
        fixture,
        '--output',
        entry,
        '--facade',
        'service-class',
        '--output-mode',
        'split',
      ],
      { encoding: 'utf-8', cwd: repoRoot }
    );
    expect(result.status, `generate-client stderr:\n${result.stderr}`).toBe(0);
    expect(existsSync(join(workDir, 'client.http.ts'))).toBe(true);
    expect(existsSync(join(workDir, 'client.schemas.ts'))).toBe(true);

    const src = readFileSync(entry, 'utf-8');
    // Default class name (no --name) is `Client`; it lives in the entry and imports
    // the shared runtime/types from the sibling modules.
    expect(src).toContain('export class Client {');
    expect(src).toContain('from "./client.http.js"');
    expect(src).toContain("export * from './client.schemas.js';");
  }, 90_000);

  test('the split class-shaped set type-checks under strict mode with no unused locals', () => {
    expect(existsSync(entry), 'generation test must run first').toBe(true);
    const tscBin = join(repoRoot, 'node_modules/.bin/tsc');
    const tsc = spawnSync(tscBin, [...TSC_ARGS, ...collectTsFiles(workDir)], {
      encoding: 'utf-8',
      cwd: workDir,
    });
    expect(tsc.status, `tsc errors:\n${tsc.stdout}\n${tsc.stderr}`).toBe(0);
  }, 90_000);
});

describe('generate-client end-to-end (--facade service-class, --output-mode tags)', () => {
  let workDir = '';
  let entry = '';

  beforeAll(() => {
    workDir = mkdtempSync(join(tmpdir(), 'sc-tags-client-'));
    entry = join(workDir, 'client.ts');
  });

  afterAll(() => {
    if (workDir && existsSync(workDir)) rmSync(workDir, { recursive: true, force: true });
  });

  test('emits one service class per tag and re-exports them from the barrel', () => {
    const result = spawnSync(
      'node',
      [
        cliEntry,
        'generate-client',
        fixture,
        '--output',
        entry,
        '--facade',
        'service-class',
        '--output-mode',
        'tags',
      ],
      { encoding: 'utf-8', cwd: repoRoot }
    );
    expect(result.status, `generate-client stderr:\n${result.stderr}`).toBe(0);

    expect(readFileSync(join(workDir, 'Products.ts'), 'utf-8')).toContain(
      'export class ProductsService {'
    );
    expect(readFileSync(join(workDir, 'Orders.ts'), 'utf-8')).toContain(
      'export class OrdersService {'
    );
    const entrySrc = readFileSync(entry, 'utf-8');
    expect(entrySrc).toContain("export * from './Products.js';");
    expect(entrySrc).toContain("export * from './Orders.js';");

    // The OPERATIONS metadata map is facade-independent: it lives once in the
    // shared schemas module (not per-tag) and is re-exported from the barrel.
    const schemasSrc = readFileSync(join(workDir, 'client.schemas.ts'), 'utf-8');
    expect(schemasSrc).toContain('export const OPERATIONS = {');
    expect(entrySrc).toContain("export * from './client.schemas.js';");
    expect(readFileSync(join(workDir, 'Products.ts'), 'utf-8')).not.toContain(
      'export const OPERATIONS'
    );
  }, 90_000);

  test('the tags class-shaped set type-checks under strict mode with no unused locals', () => {
    expect(existsSync(entry), 'generation test must run first').toBe(true);
    const tscBin = join(repoRoot, 'node_modules/.bin/tsc');
    const tsc = spawnSync(tscBin, [...TSC_ARGS, ...collectTsFiles(workDir)], {
      encoding: 'utf-8',
      cwd: workDir,
    });
    expect(tsc.status, `tsc errors:\n${tsc.stdout}\n${tsc.stderr}`).toBe(0);
  }, 90_000);
});

describe('generate-client end-to-end (--facade service-class, --output-mode tags-split)', () => {
  let workDir = '';
  let entry = '';

  beforeAll(() => {
    workDir = mkdtempSync(join(tmpdir(), 'sc-tags-split-client-'));
    entry = join(workDir, 'client.ts');
  });

  afterAll(() => {
    if (workDir && existsSync(workDir)) rmSync(workDir, { recursive: true, force: true });
  });

  test('emits one service class per tag folder, importing the shared modules via ../', () => {
    const result = spawnSync(
      'node',
      [
        cliEntry,
        'generate-client',
        fixture,
        '--output',
        entry,
        '--facade',
        'service-class',
        '--output-mode',
        'tags-split',
      ],
      { encoding: 'utf-8', cwd: repoRoot }
    );
    expect(result.status, `generate-client stderr:\n${result.stderr}`).toBe(0);

    const productsFile = join(workDir, 'Products', 'client.ts');
    expect(existsSync(productsFile)).toBe(true);
    const productsSrc = readFileSync(productsFile, 'utf-8');
    expect(productsSrc).toContain('export class ProductsService {');
    expect(productsSrc).toContain('from "../client.http.js"');
    expect(readFileSync(entry, 'utf-8')).toContain("export * from './Products/client.js';");
  }, 90_000);

  test('the tags-split class-shaped tree type-checks under strict mode with no unused locals', () => {
    expect(existsSync(entry), 'generation test must run first').toBe(true);
    const tscBin = join(repoRoot, 'node_modules/.bin/tsc');
    const tsc = spawnSync(tscBin, [...TSC_ARGS, ...collectTsFiles(workDir)], {
      encoding: 'utf-8',
      cwd: workDir,
    });
    expect(tsc.status, `tsc errors:\n${tsc.stdout}\n${tsc.stderr}`).toBe(0);
  }, 90_000);
});

describe('generate-client end-to-end — shared runtime across facades', () => {
  test('the emitted http (core) module is byte-identical for functions and service-class', () => {
    const fnDir = mkdtempSync(join(tmpdir(), 'fn-core-'));
    const scDir = mkdtempSync(join(tmpdir(), 'sc-core-'));
    try {
      const gen = (dir: string, facade: string) =>
        spawnSync(
          'node',
          [
            cliEntry,
            'generate-client',
            fixture,
            '--output',
            join(dir, 'client.ts'),
            '--output-mode',
            'split',
            '--facade',
            facade,
          ],
          { encoding: 'utf-8', cwd: repoRoot }
        );
      expect(gen(fnDir, 'functions').status).toBe(0);
      expect(gen(scDir, 'service-class').status).toBe(0);

      const fnHttp = readFileSync(join(fnDir, 'client.http.ts'), 'utf-8');
      const scHttp = readFileSync(join(scDir, 'client.http.ts'), 'utf-8');
      expect(scHttp).toBe(fnHttp);
    } finally {
      rmSync(fnDir, { recursive: true, force: true });
      rmSync(scDir, { recursive: true, force: true });
    }
  }, 90_000);
});

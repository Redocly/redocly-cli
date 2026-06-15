import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');
const cli = join(repoRoot, 'packages/cli/lib/index.js');
const tscBin = join(repoRoot, 'node_modules/.bin/tsc');

function generateAndTypecheck(fixture: string): { generated: string } {
  const dir = mkdtempSync(join(tmpdir(), 'ots-specver-'));
  const out = join(dir, 'client.ts');
  const res = spawnSync(
    'node',
    [cli, 'generate-client', join(__dirname, 'fixtures', fixture), '--output', out],
    { encoding: 'utf-8', cwd: repoRoot }
  );
  expect(res.status, res.stderr).toBe(0);
  expect(existsSync(out)).toBe(true);
  const generated = readFileSync(out, 'utf-8');
  writeFileSync(
    join(dir, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        module: 'node16',
        moduleResolution: 'node16',
        target: 'es2022',
        lib: ['ES2022', 'DOM'],
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        types: [],
      },
      include: ['client.ts'],
    }),
    'utf-8'
  );
  const tsc = spawnSync(tscBin, ['--noEmit', '-p', dir], { encoding: 'utf-8', cwd: repoRoot });
  expect(tsc.status, `tsc failed:\n${tsc.stdout}\n${tsc.stderr}`).toBe(0);
  rmSync(dir, { recursive: true, force: true });
  return { generated };
}

describe('generate-client spec versions', () => {
  it('generates a type-checking client from a Swagger 2.0 document', () => {
    const { generated } = generateAndTypecheck('swagger2.yaml');
    expect(generated).toContain('export async function getPet');
    expect(generated).toContain('export async function createPet');
    expect(generated).toContain('export type Pet');
    expect(generated).toContain('let BASE = "https://api.example.com/v2"');
  }, 60_000);

  it('generates a type-checking client from an OpenAPI 3.2 document', () => {
    const { generated } = generateAndTypecheck('oas3.2.yaml');
    expect(generated).toContain('export async function getThing');
    expect(generated).toContain('export type Thing');
    // 3.1/3.2 nullable enum renders as a nullable union.
    expect(generated).toMatch(/status\?:\s*\("active" \| "archived"\) \| null;/);
  }, 60_000);

  it('synthesizes operation names from method+path when operationId is omitted', () => {
    const { generated } = generateAndTypecheck('no-operationid.yaml');
    expect(generated).toContain('export async function getGiftcardsCardId');
  }, 60_000);
});

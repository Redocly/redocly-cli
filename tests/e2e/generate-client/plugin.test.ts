// The experimental custom-generator (plugin) API end-to-end: a `generators` entry that is a path
// specifier is dynamically imported and run alongside the built-ins, and a bad specifier fails fast.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cliEntry, repoRoot } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cafe = join(__dirname, 'fixtures', 'cafe.yaml');
const plugin = join(__dirname, 'fixtures', 'route-map-plugin.mjs');

function run(args: string[]): { status: number | null; out: string } {
  const res = spawnSync('node', [cliEntry, 'generate-client', ...args], {
    encoding: 'utf-8',
    cwd: repoRoot,
  });
  return { status: res.status, out: `${res.stdout}\n${res.stderr}` };
}

describe('generate-client custom generator (plugin) API', () => {
  it('loads a generator from a path specifier and runs it alongside the sdk', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ots-plugin-'));
    const output = join(dir, 'client.ts');
    const { status, out } = run([
      cafe,
      '--output',
      output,
      '--generator',
      'sdk',
      '--generator',
      plugin,
    ]);

    expect(status, out).toBe(0);
    expect(existsSync(output)).toBe(true);
    const routesFile = output.replace(/\.ts$/, '.routes.ts');
    expect(existsSync(routesFile)).toBe(true);
    const routes = readFileSync(routesFile, 'utf-8');
    expect(routes).toContain('export const routes = {');
    // The plugin walked the same IR the built-ins see (real operations from cafe.yaml).
    expect(routes).toMatch(/: '(GET|POST|PUT|PATCH|DELETE) \//);
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('fails fast with an actionable message when a specifier cannot be loaded', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ots-plugin-'));
    const { status, out } = run([
      cafe,
      '--output',
      join(dir, 'client.ts'),
      '--generator',
      'sdk',
      '--generator',
      join(dir, 'missing-plugin.mjs'),
    ]);
    expect(status).not.toBe(0);
    expect(out).toMatch(/Could not load generator/);
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);
});

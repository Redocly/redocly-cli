// generate-client reads its settings from a `redocly.yaml` `x-openapi-typescript`
// block (auto-discovered from the cwd / `--config`), with CLI flags overriding it.
// This is the redocly.yaml ingestion path the examples use (no `--config-file`).
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');
const cli = join(repoRoot, 'packages/cli/lib/index.js');
const fixture = join(__dirname, 'fixtures', 'cafe.yaml');

/** Write a temp project: a vendored spec + a redocly.yaml carrying the extension block. */
function project(xConfig: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'ots-redocly-'));
  copyFileSync(fixture, join(dir, 'openapi.yaml'));
  writeFileSync(join(dir, 'redocly.yaml'), `x-openapi-typescript:\n${xConfig}`, 'utf-8');
  return dir;
}

describe('generate-client redocly.yaml config (x-openapi-typescript)', () => {
  it('generates from the redocly.yaml block with no flags or --config-file', () => {
    const dir = project(
      ['  input: ./openapi.yaml', '  output: ./src/api/client.ts', '  generators: [sdk]', '  facade: service-class'].join('\n') + '\n'
    );
    const res = spawnSync('node', [cli, 'generate-client'], { cwd: dir, encoding: 'utf-8' });
    expect(res.status, res.stderr).toBe(0);
    const out = join(dir, 'src/api/client.ts');
    expect(existsSync(out)).toBe(true);
    // facade + generators came from the redocly.yaml block.
    expect(readFileSync(out, 'utf-8')).toContain('export class Client');
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('resolves an `apis:` alias passed as <input> to that API’s root', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ots-alias-'));
    copyFileSync(fixture, join(dir, 'openapi.yaml'));
    writeFileSync(join(dir, 'redocly.yaml'), 'apis:\n  cafe:\n    root: ./openapi.yaml\n', 'utf-8');
    // `cafe` is an alias, not a file path — it must resolve to ./openapi.yaml.
    const res = spawnSync('node', [cli, 'generate-client', 'cafe', '--output', join(dir, 'out.ts')], {
      cwd: dir,
      encoding: 'utf-8',
    });
    expect(res.status, res.stderr).toBe(0);
    expect(existsSync(join(dir, 'out.ts'))).toBe(true);
    expect(readFileSync(join(dir, 'out.ts'), 'utf-8')).toContain('export async function listMenuItems');
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('lets a CLI flag override the redocly.yaml block (flags win)', () => {
    const dir = project(
      ['  input: ./openapi.yaml', '  output: ./src/api/client.ts', '  generators: [sdk]', '  facade: service-class'].join('\n') + '\n'
    );
    // Override facade: service-class (in redocly.yaml) → functions (flag).
    const res = spawnSync('node', [cli, 'generate-client', '--facade', 'functions'], {
      cwd: dir,
      encoding: 'utf-8',
    });
    expect(res.status, res.stderr).toBe(0);
    const src = readFileSync(join(dir, 'src/api/client.ts'), 'utf-8');
    expect(src).toContain('export async function');
    expect(src).not.toContain('export class Client');
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('resolves the block’s relative input/output against the redocly.yaml directory', () => {
    const dir = project(
      ['  input: ./openapi.yaml', '  output: ./out/client.ts', '  generators: [sdk]'].join('\n') + '\n'
    );
    // Run from the repo root, pointing at the config elsewhere via --config.
    const res = spawnSync(
      'node',
      [cli, 'generate-client', '--config', join(dir, 'redocly.yaml')],
      { cwd: repoRoot, encoding: 'utf-8' }
    );
    expect(res.status, res.stderr).toBe(0);
    // input/output resolved relative to the redocly.yaml dir, not the cwd.
    expect(existsSync(join(dir, 'out/client.ts'))).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);
});

// generate-client reads its settings from a `redocly.yaml` `client` block (top-level
// shared defaults) and per-API `apis.<name>.client` / `clientOutput`. Three invocation
// modes: fan-out (no arg, over apis with a `client` block), an `apis:` alias, and a plain
// file path (which ignores `apis:`). CLI flags override the config.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');
const cli = join(repoRoot, 'packages/cli/lib/index.js');
const fixture = join(__dirname, 'fixtures', 'cafe.yaml');

/** Write a temp project: the cafe spec + a redocly.yaml with the given contents. */
function project(redoclyYaml: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'ots-redocly-'));
  copyFileSync(fixture, join(dir, 'openapi.yaml'));
  writeFileSync(join(dir, 'redocly.yaml'), redoclyYaml, 'utf-8');
  return dir;
}
const run = (dir: string, args: string[] = []) =>
  spawnSync('node', [cli, 'generate-client', ...args], { cwd: dir, encoding: 'utf-8' });

describe('generate-client redocly.yaml config', () => {
  it('fan-out (no arg) builds every api with a `client` block, to its clientOutput', () => {
    const dir = project(
      [
        'apis:',
        '  cafe:',
        '    root: ./openapi.yaml',
        '    clientOutput: ./src/cafe.ts',
        '    client:',
        '      generators: [sdk]',
        '      facade: service-class',
        '  lintOnly:', // no `client` block -> skipped by the fan-out
        '    root: ./openapi.yaml',
      ].join('\n') + '\n'
    );
    const res = run(dir);
    expect(res.status, res.stderr).toBe(0);
    expect(existsSync(join(dir, 'src/cafe.ts'))).toBe(true);
    expect(existsSync(join(dir, 'lintOnly.client.ts'))).toBe(false);
    expect(readFileSync(join(dir, 'src/cafe.ts'), 'utf-8')).toContain('export class Client');
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('defaults the output to `<name>.client.ts` in the config dir when clientOutput is omitted', () => {
    const dir = project(
      ['apis:', '  cafe:', '    root: ./openapi.yaml', '    client:', '      generators: [sdk]'].join(
        '\n'
      ) + '\n'
    );
    const res = run(dir);
    expect(res.status, res.stderr).toBe(0);
    expect(existsSync(join(dir, 'cafe.client.ts'))).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('resolves an `apis:` alias passed as <api>, using its client block + clientOutput', () => {
    const dir = project(
      [
        'apis:',
        '  cafe:',
        '    root: ./openapi.yaml',
        '    clientOutput: ./out.ts',
        '    client:',
        '      generators: [sdk]',
        '      facade: service-class',
      ].join('\n') + '\n'
    );
    const res = run(dir, ['cafe']);
    expect(res.status, res.stderr).toBe(0);
    expect(readFileSync(join(dir, 'out.ts'), 'utf-8')).toContain('export class Client');
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('a named alias falls back to the top-level `client` when it has no per-api block', () => {
    const dir = project(
      [
        'client:',
        '  generators: [sdk]',
        '  facade: service-class',
        'apis:',
        '  cafe:',
        '    root: ./openapi.yaml',
        '    clientOutput: ./out.ts',
      ].join('\n') + '\n'
    );
    const res = run(dir, ['cafe']);
    expect(res.status, res.stderr).toBe(0);
    // service-class came from the top-level client block (the api declares none).
    expect(readFileSync(join(dir, 'out.ts'), 'utf-8')).toContain('export class Client');
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('a plain file path ignores `apis:` and uses the top-level `client` defaults', () => {
    const dir = project(
      [
        'client:',
        '  generators: [sdk]',
        '  facade: functions',
        'apis:',
        '  cafe:',
        '    root: ./openapi.yaml',
        '    client:',
        '      facade: service-class', // must NOT apply to a path invocation
      ].join('\n') + '\n'
    );
    const res = run(dir, ['./openapi.yaml', '--output', './out.ts']);
    expect(res.status, res.stderr).toBe(0);
    const out = readFileSync(join(dir, 'out.ts'), 'utf-8');
    expect(out).toContain('export async function listMenuItems'); // functions facade (top-level)
    expect(out).not.toContain('export class Client'); // per-api service-class ignored
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('CLI flags override the client block', () => {
    const dir = project(
      [
        'apis:',
        '  cafe:',
        '    root: ./openapi.yaml',
        '    clientOutput: ./out.ts',
        '    client:',
        '      facade: service-class',
      ].join('\n') + '\n'
    );
    const res = run(dir, ['cafe', '--facade', 'functions']);
    expect(res.status, res.stderr).toBe(0);
    expect(readFileSync(join(dir, 'out.ts'), 'utf-8')).toContain(
      'export async function listMenuItems'
    );
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('rejects --output in fan-out mode', () => {
    const dir = project(
      ['apis:', '  cafe:', '    root: ./openapi.yaml', '    client:', '      generators: [sdk]'].join(
        '\n'
      ) + '\n'
    );
    const res = run(dir, ['--output', './out.ts']);
    expect(res.status).not.toBe(0);
    expect(res.stderr).toContain("--output can't target multiple APIs");
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('errors when no api has a `client` block and none is named', () => {
    const dir = project(['apis:', '  cafe:', '    root: ./openapi.yaml'].join('\n') + '\n');
    const res = run(dir);
    expect(res.status).not.toBe(0);
    expect(res.stderr).toContain('No API to generate');
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('resolves a relative clientOutput against the redocly.yaml dir (via --config)', () => {
    const dir = project(
      [
        'apis:',
        '  cafe:',
        '    root: ./openapi.yaml',
        '    clientOutput: ./out/client.ts',
        '    client:',
        '      generators: [sdk]',
      ].join('\n') + '\n'
    );
    // Run from the repo root, pointing at the config elsewhere via --config.
    const res = spawnSync('node', [cli, 'generate-client', '--config', join(dir, 'redocly.yaml')], {
      cwd: repoRoot,
      encoding: 'utf-8',
    });
    expect(res.status, res.stderr).toBe(0);
    expect(existsSync(join(dir, 'out/client.ts'))).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);
});

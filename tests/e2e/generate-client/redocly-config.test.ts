// generate-client reads its settings from a `redocly.yaml` `client` block (top-level
// shared defaults) and per-API `apis.<name>.client` / `clientOutput`. Three invocation
// modes: fan-out (no arg, over apis with a `client` block), an `apis:` alias, and a plain
// file path (which ignores `apis:`). CLI flags override the config.
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  copyFileSync,
} from 'node:fs';
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
        '  lintOnly:', // no `client` block -> skipped by the fan-out
        '    root: ./openapi.yaml',
      ].join('\n') + '\n'
    );
    const res = run(dir);
    expect(res.status, res.stderr).toBe(0);
    expect(existsSync(join(dir, 'src/cafe.ts'))).toBe(true);
    expect(existsSync(join(dir, 'lintOnly.client.ts'))).toBe(false);
    expect(readFileSync(join(dir, 'src/cafe.ts'), 'utf-8')).toContain(
      'export const client = createClient<Ops, OperationId, OperationPath, OperationTag>(OPERATIONS,'
    );
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('defaults the output to `<name>.client.ts` in the config dir when clientOutput is omitted', () => {
    const dir = project(
      [
        'apis:',
        '  cafe:',
        '    root: ./openapi.yaml',
        '    client:',
        '      generators: [sdk]',
      ].join('\n') + '\n'
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
        '      serverUrl: https://per-api.example.com',
      ].join('\n') + '\n'
    );
    const res = run(dir, ['cafe']);
    expect(res.status, res.stderr).toBe(0);
    expect(readFileSync(join(dir, 'out.ts'), 'utf-8')).toContain(
      'serverUrl: "https://per-api.example.com"'
    );
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('a named alias falls back to the top-level `client` when it has no per-api block', () => {
    const dir = project(
      [
        'client:',
        '  generators: [sdk]',
        '  serverUrl: https://top-level.example.com',
        'apis:',
        '  cafe:',
        '    root: ./openapi.yaml',
        '    clientOutput: ./out.ts',
      ].join('\n') + '\n'
    );
    const res = run(dir, ['cafe']);
    expect(res.status, res.stderr).toBe(0);
    // serverUrl came from the top-level client block (the api declares none).
    expect(readFileSync(join(dir, 'out.ts'), 'utf-8')).toContain(
      'serverUrl: "https://top-level.example.com"'
    );
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('a plain file path ignores `apis:` and uses the top-level `client` defaults', () => {
    const dir = project(
      [
        'client:',
        '  generators: [sdk]',
        '  serverUrl: https://top-level.example.com',
        'apis:',
        '  cafe:',
        '    root: ./openapi.yaml',
        '    client:',
        '      serverUrl: https://per-api.example.com', // must NOT apply to a path invocation
      ].join('\n') + '\n'
    );
    const res = run(dir, ['./openapi.yaml', '--output', './out.ts']);
    expect(res.status, res.stderr).toBe(0);
    const out = readFileSync(join(dir, 'out.ts'), 'utf-8');
    expect(out).toContain('serverUrl: "https://top-level.example.com"'); // top-level applied
    expect(out).not.toContain('https://per-api.example.com'); // per-api block ignored
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
        '      generators: [sdk]',
        '      serverUrl: https://per-api.example.com',
      ].join('\n') + '\n'
    );
    const res = run(dir, ['cafe', '--server-url', 'https://flag.example.com']);
    expect(res.status, res.stderr).toBe(0);
    expect(readFileSync(join(dir, 'out.ts'), 'utf-8')).toContain(
      'serverUrl: "https://flag.example.com"'
    );
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('warns on a removed `facade` key (config struct rule) but still generates', () => {
    const dir = project(
      [
        'apis:',
        '  cafe:',
        '    root: ./openapi.yaml',
        '    clientOutput: ./out.ts',
        '    client:',
        '      generators: [sdk]',
        '      facade: service-class', // removed option -> property-not-expected warning
      ].join('\n') + '\n'
    );
    const res = run(dir, ['cafe']);
    expect(res.status, res.stderr).toBe(0);
    expect(res.stdout + res.stderr).toContain('Property `facade` is not expected here.');
    expect(res.stderr).toContain('Your config has 1 warning');
    expect(existsSync(join(dir, 'out.ts'))).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('rejects --output in fan-out mode', () => {
    const dir = project(
      [
        'apis:',
        '  cafe:',
        '    root: ./openapi.yaml',
        '    client:',
        '      generators: [sdk]',
      ].join('\n') + '\n'
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

  it('errors when two fan-out apis resolve to the same clientOutput', () => {
    const dir = project(
      [
        'apis:',
        '  a:',
        '    root: ./openapi.yaml',
        '    clientOutput: ./dupe.ts',
        '    client: { generators: [sdk] }',
        '  b:',
        '    root: ./openapi.yaml',
        '    clientOutput: ./dupe.ts',
        '    client: { generators: [sdk] }',
      ].join('\n') + '\n'
    );
    const res = run(dir);
    expect(res.status).not.toBe(0);
    expect(res.stderr).toContain('resolve to the same output path');
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('rejects a bare-hostname serverUrl but accepts absolute and root-relative', () => {
    const withServerUrl = (serverUrl: string) =>
      project(
        [
          'apis:',
          '  cafe:',
          '    root: ./openapi.yaml',
          '    clientOutput: ./out.ts',
          '    client:',
          '      generators: [sdk]',
          `      serverUrl: ${serverUrl}`,
        ].join('\n') + '\n'
      );
    const bare = withServerUrl('api.example.com');
    const bad = run(bare, ['cafe']);
    expect(bad.status).not.toBe(0);
    expect(bad.stderr).toContain('--server-url must be an absolute URL');
    rmSync(bare, { recursive: true, force: true });

    for (const ok of ['https://api.example.com', '/v1']) {
      const dir = withServerUrl(ok);
      const res = run(dir, ['cafe']);
      expect(res.status, res.stderr).toBe(0);
      rmSync(dir, { recursive: true, force: true });
    }

    // Non-http(s) schemes and protocol-relative hosts are rejected too — the value is
    // inlined as the client's default fetch base.
    for (const hostile of ['javascript:alert(1)', 'file:///etc/passwd', '//evil.example.com']) {
      const dir = withServerUrl(`"${hostile}"`);
      const res = run(dir, ['cafe']);
      expect(res.status, `expected rejection for ${hostile}`).not.toBe(0);
      expect(res.stderr).toContain('--server-url must be an absolute URL');
      rmSync(dir, { recursive: true, force: true });
    }
  }, 60_000);

  it('rejects a URL `client.setup` upfront (setup is a local module baked into the client)', () => {
    const dir = project(
      [
        'apis:',
        '  cafe:',
        '    root: ./openapi.yaml',
        '    clientOutput: ./out.ts',
        '    client:',
        '      generators: [sdk]',
        '      setup: https://cdn.example.com/setup.ts',
      ].join('\n') + '\n'
    );
    const res = run(dir, ['cafe']);
    expect(res.status).not.toBe(0);
    expect(res.stderr).toContain('must be a local file path');
    rmSync(dir, { recursive: true, force: true });
  }, 60_000);

  it('a `client.runtime: package` config block reaches the writer', () => {
    const dir = project(
      [
        'apis:',
        '  cafe:',
        '    root: ./openapi.yaml',
        '    clientOutput: ./out.ts',
        '    client:',
        '      generators: [sdk]',
        '      runtime: package',
      ].join('\n') + '\n'
    );
    const res = run(dir, ['cafe']);
    expect(res.status, res.stderr).toBe(0);
    const out = readFileSync(join(dir, 'out.ts'), 'utf-8');
    expect(out).toContain("from '@redocly/client-generator'");
    expect(out).not.toContain('__send');
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

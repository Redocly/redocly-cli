import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');
const cli = join(repoRoot, 'packages/cli/lib/index.js');
const fixture = join(__dirname, 'fixtures/base.yaml');

describe('generate-client config file', () => {
  let dir = '';
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'ots-cfgfile-'));
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('reads input/output from a .mjs config file', () => {
    const out = join(dir, 'client.ts');
    const cfg = join(dir, 'gen.config.mjs');
    writeFileSync(
      cfg,
      `export default { input: ${JSON.stringify(fixture)}, output: ${JSON.stringify(out)} };\n`,
      'utf-8'
    );
    const res = spawnSync('node', [cli, 'generate-client', '--config-file', cfg], {
      encoding: 'utf-8',
      cwd: repoRoot,
    });
    expect(res.status, res.stderr).toBe(0);
    expect(existsSync(out)).toBe(true);
    expect(readFileSync(out, 'utf-8')).toContain('export async function getPetById');
  }, 30_000);

  it('honors a config-file value for a CLI-defaulted option (no flag clobbering)', () => {
    // `outputMode: 'split'` from the file must produce multiple files even though no
    // `--output-mode` flag is passed — i.e. the CLI must NOT inject a default that
    // overrides the config file. Single mode would emit just the one anchor file.
    const out = join(dir, 'split/client.ts');
    const cfg = join(dir, 'split.config.mjs');
    writeFileSync(
      cfg,
      `export default { input: ${JSON.stringify(fixture)}, output: ${JSON.stringify(out)}, outputMode: 'split' };\n`,
      'utf-8'
    );
    const res = spawnSync('node', [cli, 'generate-client', '--config-file', cfg], {
      encoding: 'utf-8',
      cwd: repoRoot,
    });
    expect(res.status, res.stderr).toBe(0);
    // split mode emits sibling .http.ts and .schemas.ts next to the entry.
    expect(existsSync(join(dir, 'split/client.http.ts'))).toBe(true);
    expect(existsSync(join(dir, 'split/client.schemas.ts'))).toBe(true);
  }, 30_000);
});

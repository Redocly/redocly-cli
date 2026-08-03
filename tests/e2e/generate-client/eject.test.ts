import { spawnSync } from 'node:child_process';
import {
  appendFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cliEntry, repoRoot } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** A throwaway project where `@redocly/client-generator` resolves like a user install. */
function makeProject(): string {
  const dir = mkdtempSync(join(tmpdir(), 'eject-'));
  copyFileSync(join(__dirname, 'fixtures/pagination.yaml'), join(dir, 'openapi.yaml'));
  mkdirSync(join(dir, 'node_modules/@redocly'), { recursive: true });
  symlinkSync(
    join(repoRoot, 'packages/client-generator'),
    join(dir, 'node_modules/@redocly/client-generator')
  );
  return dir;
}

function run(cwd: string, args: string[]) {
  return spawnSync('node', [cliEntry, ...args], { cwd, encoding: 'utf-8' });
}

describe('eject-generator / scaffold-generator (end-to-end)', () => {
  let project: string;

  beforeAll(() => {
    project = makeProject();
  }, 60_000);

  afterAll(() => {
    rmSync(project, { recursive: true, force: true });
  }, 60_000);

  it('ejects php: file + pristine snapshot + AGENTS.md, and re-eject without --force errors', () => {
    const eject = run(project, ['eject-generator', 'php']);
    expect(eject.status, eject.stderr).toBe(0);
    expect(existsSync(join(project, 'generators/php.mjs'))).toBe(true);
    expect(existsSync(join(project, 'generators/.pristine/php.mjs'))).toBe(true);
    expect(readFileSync(join(project, 'generators/AGENTS.md'), 'utf-8')).toContain(
      'redocly-generators:begin'
    );
    // The generator's OWN design skill ships alongside — the file an agent reads
    // before editing the ejected generator.
    expect(readFileSync(join(project, 'generators/php.AGENTS.md'), 'utf-8')).toContain(
      'edit this skill first'
    );
    expect(run(project, ['eject-generator', 'php']).status).not.toBe(0);
    expect(run(project, ['eject-generator', 'php', '--force']).status).toBe(0);
  }, 60_000);

  it('THE headline: an ejected-unmodified generator produces byte-identical output', () => {
    const builtin = run(project, [
      'generate-client',
      'openapi.yaml',
      '--output',
      'builtin/client.ts',
      '--generator',
      'php',
    ]);
    expect(builtin.status, builtin.stderr).toBe(0);
    const ejected = run(project, [
      'generate-client',
      'openapi.yaml',
      '--output',
      'ejected/client.ts',
      '--generator',
      './generators/php.mjs',
    ]);
    expect(ejected.status, ejected.stderr).toBe(0);
    expect(ejected.stderr).toContain('takes over the built-in generator');
    expect(readFileSync(join(project, 'ejected/client.php'), 'utf-8')).toBe(
      readFileSync(join(project, 'builtin/client.php'), 'utf-8')
    );
  }, 60_000);

  it('sdk prints guidance instead of ejecting; unknown names error', () => {
    const sdk = run(project, ['eject-generator', 'sdk']);
    expect(sdk.status).toBe(0);
    expect(sdk.stderr + sdk.stdout).toContain('not ejectable');
    expect(existsSync(join(project, 'generators/sdk.mjs'))).toBe(false);
    expect(run(project, ['eject-generator', 'nowhere']).status).not.toBe(0);
  }, 60_000);

  it('--update merges cleanly around local edits and marks real conflicts', () => {
    appendFileSync(join(project, 'generators/php.mjs'), '// my local customization\n');
    const clean = run(project, ['eject-generator', 'php', '--update']);
    expect(clean.status, clean.stderr).toBe(0);
    expect(readFileSync(join(project, 'generators/php.mjs'), 'utf-8')).toContain(
      '// my local customization'
    );

    // Diverge the same first line in the pristine base and the user copy: a true conflict.
    for (const [file, line] of [
      ['generators/.pristine/php.mjs', '// OLD pristine line'],
      ['generators/php.mjs', '// USER edited line'],
    ] as const) {
      const path = join(project, file);
      const lines = readFileSync(path, 'utf-8').split('\n');
      lines[0] = line;
      writeFileSync(path, lines.join('\n'), 'utf-8');
    }
    const conflicted = run(project, ['eject-generator', 'php', '--update']);
    expect(conflicted.status, conflicted.stderr).toBe(0);
    expect(conflicted.stderr + conflicted.stdout).toContain('conflict');
    expect(readFileSync(join(project, 'generators/php.mjs'), 'utf-8')).toContain('<<<<<<<');
  }, 60_000);

  it('scaffold-generator creates a runnable skeleton; built-in names are refused', () => {
    const scaffold = run(project, ['scaffold-generator', 'route-map']);
    expect(scaffold.status, scaffold.stderr).toBe(0);
    const generate = run(project, [
      'generate-client',
      'openapi.yaml',
      '--output',
      'scaffolded/client.ts',
      '--generator',
      'sdk',
      '--generator',
      './generators/route-map.mjs',
    ]);
    expect(generate.status, generate.stderr).toBe(0);
    expect(readFileSync(join(project, 'scaffolded/client.route-map.txt'), 'utf-8')).toContain(
      'GET /orders — listOrders'
    );
    expect(run(project, ['scaffold-generator', 'php']).status).not.toBe(0);
  }, 60_000);
});

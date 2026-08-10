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

describe('eject-generator (end-to-end)', () => {
  let project: string;

  beforeAll(() => {
    project = makeProject();
  }, 60_000);

  afterAll(() => {
    rmSync(project, { recursive: true, force: true });
  }, 60_000);

  it('ejects php: the generator, both skills, a pointer beside the code; re-eject needs --force', () => {
    const eject = run(project, ['eject-generator', 'php']);
    expect(eject.status, eject.stderr).toBe(0);
    expect(existsSync(join(project, 'generators/php.mjs'))).toBe(true);
    // Nothing extra is committed: the merge base comes from the version in the header.
    expect(existsSync(join(project, 'generators/.pristine'))).toBe(false);

    // The design ships where an agent auto-loads it, with skill frontmatter.
    const design = readFileSync(join(project, '.claude/skills/php-generator/SKILL.md'), 'utf-8');
    expect(design).toContain('name: php-generator');
    expect(design).toContain('edit this skill first');
    // …together with the shared authoring skill (the toolkit and the model).
    const authoring = readFileSync(
      join(project, '.claude/skills/client-generators/SKILL.md'),
      'utf-8'
    );
    expect(authoring).toContain('name: client-generators');
    expect(authoring).toContain('flattenAllOf');
    // And a short pointer next to the code, so the directory explains itself.
    const pointer = readFileSync(join(project, 'generators/AGENTS.md'), 'utf-8');
    expect(pointer).toContain('redocly-generators:begin');
    expect(pointer).toContain('.claude/skills/php-generator/SKILL.md');

    expect(run(project, ['eject-generator', 'php']).status).not.toBe(0);
    expect(run(project, ['eject-generator', 'php', '--force']).status).toBe(0);
  }, 60_000);

  it('wires itself up: devDependency recorded and the config entry added, once', () => {
    const wired = mkdtempSync(join(tmpdir(), 'eject-wire-'));
    try {
      writeFileSync(join(wired, 'package.json'), JSON.stringify({ name: 'demo' }), 'utf-8');
      writeFileSync(
        join(wired, 'redocly.yaml'),
        'extends: []\nclient:\n  generators:\n    - sdk\n',
        'utf-8'
      );
      const eject = run(wired, ['eject-generator', 'go']);
      expect(eject.status, eject.stderr).toBe(0);

      const pkg = JSON.parse(readFileSync(join(wired, 'package.json'), 'utf-8'));
      // The recorded range is the TOOLKIT's version — the package the ejected file imports.
      const toolkitVersion = JSON.parse(
        readFileSync(join(repoRoot, 'packages/client-generator/package.json'), 'utf-8')
      ).version;
      expect(pkg.devDependencies['@redocly/client-generator']).toBe(`^${toolkitVersion}`);
      expect(readFileSync(join(wired, 'redocly.yaml'), 'utf-8')).toBe(
        'extends: []\nclient:\n  generators:\n    - sdk\n    - ./generators/go.mjs\n'
      );

      // Re-ejecting must not add the entry twice.
      expect(run(wired, ['eject-generator', 'go', '--force']).status).toBe(0);
      expect(readFileSync(join(wired, 'redocly.yaml'), 'utf-8').match(/go\.mjs/g)).toHaveLength(1);

      // `--update` re-wires a recorded range the new toolkit no longer satisfies.
      const pinned = JSON.parse(readFileSync(join(wired, 'package.json'), 'utf-8'));
      pinned.devDependencies['@redocly/client-generator'] = '^0.0.1';
      writeFileSync(join(wired, 'package.json'), JSON.stringify(pinned, null, 2), 'utf-8');
      expect(run(wired, ['eject-generator', 'go', '--update']).status).toBe(0);
      expect(
        JSON.parse(readFileSync(join(wired, 'package.json'), 'utf-8')).devDependencies[
          '@redocly/client-generator'
        ]
      ).toBe(`^${toolkitVersion}`);
    } finally {
      rmSync(wired, { recursive: true, force: true });
    }
  }, 60_000);

  it('prints the config snippet when it cannot safely edit the config', () => {
    const manual = mkdtempSync(join(tmpdir(), 'eject-manual-'));
    try {
      const eject = run(manual, ['eject-generator', 'go']);
      expect(eject.status, eject.stderr).toBe(0);
      expect(eject.stderr + eject.stdout).toContain('generators:');
      expect(eject.stderr + eject.stdout).toContain('./generators/go.mjs');
    } finally {
      rmSync(manual, { recursive: true, force: true });
    }
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

  it('THE headline holds for a bundled TypeScript generator too', () => {
    const eject = run(project, ['eject-generator', 'zod']);
    expect(eject.status, eject.stderr).toBe(0);

    const builtin = run(project, [
      'generate-client',
      'openapi.yaml',
      '--output',
      'zod-builtin/client.ts',
      '--generator',
      'sdk',
      '--generator',
      'zod',
    ]);
    expect(builtin.status, builtin.stderr).toBe(0);
    const ejected = run(project, [
      'generate-client',
      'openapi.yaml',
      '--output',
      'zod-ejected/client.ts',
      '--generator',
      'sdk',
      '--generator',
      './generators/zod.mjs',
    ]);
    expect(ejected.status, ejected.stderr).toBe(0);
    expect(readFileSync(join(project, 'zod-ejected/client.zod.ts'), 'utf-8')).toBe(
      readFileSync(join(project, 'zod-builtin/client.zod.ts'), 'utf-8')
    );
  }, 60_000);

  it('a framework variant points at the generator it is an argument of; unknown names error', () => {
    const variant = run(project, ['eject-generator', 'tanstack-query-vue']);
    expect(variant.status).toBe(0);
    expect(variant.stderr + variant.stdout).toContain("tanstackQueryGenerator('vue')");
    expect(existsSync(join(project, 'generators/tanstack-query-vue.mjs'))).toBe(false);
    expect(run(project, ['eject-generator', 'nowhere']).status).not.toBe(0);
  }, 60_000);

  it('--update merges cleanly around local edits and marks real conflicts', () => {
    appendFileSync(join(project, 'generators/php.mjs'), '// my local customization\n');
    // The skill is edit-first too — an update must merge around a design note, not drop it.
    const skillPath = join(project, '.claude/skills/php-generator/SKILL.md');
    appendFileSync(skillPath, '\n## Our fork\n\nWe keep the legacy auth header.\n');
    const clean = run(project, ['eject-generator', 'php', '--update']);
    expect(clean.status, clean.stderr).toBe(0);
    expect(readFileSync(join(project, 'generators/php.mjs'), 'utf-8')).toContain(
      '// my local customization'
    );
    expect(readFileSync(skillPath, 'utf-8')).toContain('We keep the legacy auth header.');

    // A `.pristine/` copy from an older CLI still works as the base, and says it can go.
    const legacy = join(project, 'generators/.pristine');
    mkdirSync(legacy, { recursive: true });
    const ejected = join(project, 'generators/php.mjs');
    const base = readFileSync(ejected, 'utf-8').split('\n');
    const mine = [...base];
    base[0] = '// OLD base line';
    mine[0] = '// USER edited line';
    writeFileSync(join(legacy, 'php.mjs'), base.join('\n'), 'utf-8');
    writeFileSync(ejected, mine.join('\n'), 'utf-8');
    const conflicted = run(project, ['eject-generator', 'php', '--update']);
    expect(conflicted.status, conflicted.stderr).toBe(0);
    const output = conflicted.stderr + conflicted.stdout;
    expect(output).toContain('conflict');
    expect(output).toContain('.pristine');
    expect(readFileSync(ejected, 'utf-8')).toContain('<<<<<<<');
  }, 60_000);
});

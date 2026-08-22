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

import { cliEntry, repoRoot, tsxBin } from './helpers.js';

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
    // A language generator ejects as its source folder — one file per stage, entry index.ts.
    expect(existsSync(join(project, 'generators/php/index.ts'))).toBe(true);
    expect(existsSync(join(project, 'generators/php/naming.ts'))).toBe(true);
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
        'extends: []\nclient:\n  generators:\n    - typescript\n',
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
        'extends: []\nclient:\n  generators:\n    - typescript\n    - ./generators/go/index.ts\n'
      );

      // Re-ejecting must not add the entry twice.
      expect(run(wired, ['eject-generator', 'go', '--force']).status).toBe(0);
      expect(
        readFileSync(join(wired, 'redocly.yaml'), 'utf-8').match(/go\/index\.ts/g)
      ).toHaveLength(1);

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
      const output = eject.stderr + eject.stdout;
      expect(output).toContain('generators:');
      expect(output).toContain('./generators/go/index.ts');
      // Unwired, the run instruction has to name the copy — nothing else points at it.
      expect(output).toContain(
        'Run it: redocly generate-client <api> --output <path> --generator ./generators/go/index.ts'
      );
      expect(output).toContain('https://redocly.com/docs/cli/commands/eject-generator');
    } finally {
      rmSync(manual, { recursive: true, force: true });
    }
  }, 60_000);

  it('tells the reader how to run what it just ejected', () => {
    const project = makeProject();
    try {
      writeFileSync(join(project, 'redocly.yaml'), 'apis:\n  main:\n    root: openapi.yaml\n');
      const eject = run(project, ['eject-generator', 'python']);
      expect(eject.status, eject.stderr).toBe(0);
      const output = eject.stderr + eject.stdout;
      // Wired into the config, the generator needs no flag — only an api and an output.
      expect(output).toContain('Run it: redocly generate-client <api> --output <path>\n');
      expect(output).toContain('Edit generators/python/ and run that again');
      expect(output).toContain('https://redocly.com/docs/cli/commands/eject-generator');
      // And that command works as printed.
      const generated = run(project, ['generate-client', 'openapi.yaml', '--output', 'client.ts']);
      expect(generated.status, generated.stderr).toBe(0);
      expect(existsSync(join(project, 'client.py'))).toBe(true);
    } finally {
      rmSync(project, { recursive: true, force: true });
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
      './generators/php/index.ts',
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
      'typescript',
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
      'typescript',
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

  it('--update merges a folder generator per file, keeping local edits', () => {
    appendFileSync(join(project, 'generators/php/index.ts'), '// my local customization\n');
    appendFileSync(join(project, 'generators/php/naming.ts'), '// naming tweak\n');
    // The skill is edit-first too — an update must merge around a design note, not drop it.
    const skillPath = join(project, '.claude/skills/php-generator/SKILL.md');
    appendFileSync(skillPath, '\n## Our fork\n\nWe keep the legacy auth header.\n');
    const clean = run(project, ['eject-generator', 'php', '--update']);
    expect(clean.status, clean.stderr).toBe(0);
    expect(readFileSync(join(project, 'generators/php/index.ts'), 'utf-8')).toContain(
      '// my local customization'
    );
    expect(readFileSync(join(project, 'generators/php/naming.ts'), 'utf-8')).toContain(
      '// naming tweak'
    );
    expect(readFileSync(skillPath, 'utf-8')).toContain('We keep the legacy auth header.');
  }, 60_000);

  it('--update marks real conflicts, and a legacy .pristine base still works', () => {
    // zod is a single-file eject, where the `.pristine/` copy from an older CLI still
    // works as the merge base — and the report says it can go.
    const legacy = join(project, 'generators/.pristine');
    mkdirSync(legacy, { recursive: true });
    const ejected = join(project, 'generators/zod.mjs');
    const base = readFileSync(ejected, 'utf-8').split('\n');
    const mine = [...base];
    base[0] = '// OLD base line';
    mine[0] = '// USER edited line';
    writeFileSync(join(legacy, 'zod.mjs'), base.join('\n'), 'utf-8');
    writeFileSync(ejected, mine.join('\n'), 'utf-8');
    const conflicted = run(project, ['eject-generator', 'zod', '--update']);
    expect(conflicted.status, conflicted.stderr).toBe(0);
    const output = conflicted.stderr + conflicted.stdout;
    expect(output).toContain('conflict');
    expect(output).toContain('.pristine');
    expect(readFileSync(ejected, 'utf-8')).toContain('<<<<<<<');
  }, 60_000);
});

describe('eject-generator from source (no bundle)', () => {
  // The command reads its assets beside the bundle, which only the CLI build produces.
  // Running `packages/cli/src` — what `npm run cli` does — used to fail with an ENOENT
  // naming a path inside `src`, so contributors could not eject during development.
  it('ejects every generator when the CLI runs from src', () => {
    const project = makeProject();
    try {
      for (const generator of ['python', 'go', 'php', 'typescript', 'cli']) {
        const result = spawnSync(
          tsxBin,
          [join(repoRoot, 'packages/cli/src/index.ts'), 'eject-generator', generator],
          { cwd: project, encoding: 'utf-8' }
        );
        expect(result.status, `${generator}: ${result.stdout}\n${result.stderr}`).toBe(0);
        const copy = ['python', 'go', 'php'].includes(generator)
          ? `generators/${generator}/index.ts`
          : `generators/${generator}.mjs`;
        expect(existsSync(join(project, copy))).toBe(true);
      }
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  }, 120_000);
});

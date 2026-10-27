import {
  appendFileSync,
  copyFileSync,
  cpSync,
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

import { cleanupOutput, runCommandResult } from '../../helpers.js';
import { cliEntry, repoRoot, runTsx } from '../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const snapshots = join(__dirname, '__snapshots__');

/** A throwaway project where `@redocly/client-generator` resolves like a user install. */
function makeProject(): string {
  const dir = mkdtempSync(join(tmpdir(), 'eject-'));
  copyFileSync(join(repoRoot, 'resources/cafe.yaml'), join(dir, 'openapi.yaml'));
  mkdirSync(join(dir, 'node_modules/@redocly'), { recursive: true });
  symlinkSync(
    join(repoRoot, 'packages/client-generator'),
    join(dir, 'node_modules/@redocly/client-generator')
  );
  return dir;
}

describe('eject-generator (end-to-end)', () => {
  // Each test gets its own project, so a test never reads what an earlier test ejected.
  let project = '';

  beforeEach(() => {
    project = makeProject();
  });

  afterEach(() => {
    rmSync(project, { recursive: true, force: true });
  });

  it('ejects php: the generator, both skills, a pointer beside the code; re-eject needs --force', () => {
    const eject = runCommandResult('node', [cliEntry, 'eject-generator', 'php'], {
      testPath: project,
    });
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

    expect(
      runCommandResult('node', [cliEntry, 'eject-generator', 'php'], { testPath: project }).status
    ).not.toBe(0);
    expect(
      runCommandResult('node', [cliEntry, 'eject-generator', 'php', '--force'], {
        testPath: project,
      }).status
    ).toBe(0);
  });

  it('wires itself up: devDependency recorded and the config entry added, once', () => {
    const wired = mkdtempSync(join(tmpdir(), 'eject-wire-'));
    try {
      cpSync(join(__dirname, 'wired-project'), wired, { recursive: true });
      const eject = runCommandResult('node', [cliEntry, 'eject-generator', 'go'], {
        testPath: wired,
      });
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
      expect(
        runCommandResult('node', [cliEntry, 'eject-generator', 'go', '--force'], {
          testPath: wired,
        }).status
      ).toBe(0);
      expect(
        readFileSync(join(wired, 'redocly.yaml'), 'utf-8').match(/go\/index\.ts/g)
      ).toHaveLength(1);

      // `--update` re-wires a recorded range the new toolkit no longer satisfies.
      const pinned = JSON.parse(readFileSync(join(wired, 'package.json'), 'utf-8'));
      pinned.devDependencies['@redocly/client-generator'] = '^0.0.1';
      writeFileSync(join(wired, 'package.json'), JSON.stringify(pinned, null, 2), 'utf-8');
      expect(
        runCommandResult('node', [cliEntry, 'eject-generator', 'go', '--update'], {
          testPath: wired,
        }).status
      ).toBe(0);
      expect(
        JSON.parse(readFileSync(join(wired, 'package.json'), 'utf-8')).devDependencies[
          '@redocly/client-generator'
        ]
      ).toBe(`^${toolkitVersion}`);
    } finally {
      rmSync(wired, { recursive: true, force: true });
    }
  });

  it('prints the config snippet when it cannot safely edit the config', async () => {
    const manual = mkdtempSync(join(tmpdir(), 'eject-manual-'));
    try {
      const eject = runCommandResult('node', [cliEntry, 'eject-generator', 'go'], {
        testPath: manual,
      });
      expect(eject.status, eject.stderr).toBe(0);
      // Unwired, the run instruction has to name the copy — nothing else points at it.
      await expect(cleanupOutput(eject.stderr + eject.stdout)).toMatchFileSnapshot(
        join(snapshots, 'unwired-config.txt')
      );
    } finally {
      rmSync(manual, { recursive: true, force: true });
    }
  });

  it('tells the reader how to run what it just ejected', async () => {
    copyFileSync(join(__dirname, 'apis-config.yaml'), join(project, 'redocly.yaml'));
    const eject = runCommandResult('node', [cliEntry, 'eject-generator', 'python'], {
      testPath: project,
    });
    expect(eject.status, eject.stderr).toBe(0);
    // Wired into the config, the generator needs no flag — only an api and an output.
    await expect(cleanupOutput(eject.stderr + eject.stdout)).toMatchFileSnapshot(
      join(snapshots, 'wired-config.txt')
    );
    // And that command works as printed.
    const generated = runCommandResult(
      'node',
      [cliEntry, 'generate-client', 'openapi.yaml', '--output', 'client.ts'],
      { testPath: project }
    );
    expect(generated.status, generated.stderr).toBe(0);
    expect(existsSync(join(project, 'client.py'))).toBe(true);
  });

  it('an ejected, unmodified php generator writes byte-identical output', () => {
    expect(
      runCommandResult('node', [cliEntry, 'eject-generator', 'php'], { testPath: project }).status
    ).toBe(0);
    const builtin = runCommandResult(
      'node',
      [
        cliEntry,
        'generate-client',
        'openapi.yaml',
        '--output',
        'builtin/client.ts',
        '--generator',
        'php',
      ],
      { testPath: project }
    );
    expect(builtin.status, builtin.stderr).toBe(0);
    const ejected = runCommandResult(
      'node',
      [
        cliEntry,
        'generate-client',
        'openapi.yaml',
        '--output',
        'ejected/client.ts',
        '--generator',
        './generators/php/index.ts',
      ],
      { testPath: project }
    );
    expect(ejected.status, ejected.stderr).toBe(0);
    expect(ejected.stderr).toContain('takes over the built-in generator');
    expect(readFileSync(join(project, 'ejected/client.php'), 'utf-8')).toBe(
      readFileSync(join(project, 'builtin/client.php'), 'utf-8')
    );
  });

  it('an ejected, unmodified zod generator writes byte-identical output', () => {
    const eject = runCommandResult('node', [cliEntry, 'eject-generator', 'zod'], {
      testPath: project,
    });
    expect(eject.status, eject.stderr).toBe(0);

    const builtin = runCommandResult(
      'node',
      [
        cliEntry,
        'generate-client',
        'openapi.yaml',
        '--output',
        'zod-builtin/client.ts',
        '--generator',
        'typescript',
        '--generator',
        'zod',
      ],
      { testPath: project }
    );
    expect(builtin.status, builtin.stderr).toBe(0);
    const ejected = runCommandResult(
      'node',
      [
        cliEntry,
        'generate-client',
        'openapi.yaml',
        '--output',
        'zod-ejected/client.ts',
        '--generator',
        'typescript',
        '--generator',
        './generators/zod/index.ts',
      ],
      { testPath: project }
    );
    expect(ejected.status, ejected.stderr).toBe(0);
    expect(readFileSync(join(project, 'zod-ejected/client.zod.ts'), 'utf-8')).toBe(
      readFileSync(join(project, 'zod-builtin/client.zod.ts'), 'utf-8')
    );
  });

  it('a framework variant points at the generator it is an argument of; unknown names error', () => {
    const variant = runCommandResult('node', [cliEntry, 'eject-generator', 'tanstack-query-vue'], {
      testPath: project,
    });
    expect(variant.status).toBe(0);
    expect(variant.stderr + variant.stdout).toContain("tanstackQueryGenerator('vue')");
    expect(existsSync(join(project, 'generators/tanstack-query-vue'))).toBe(false);
    expect(
      runCommandResult('node', [cliEntry, 'eject-generator', 'nowhere'], { testPath: project })
        .status
    ).not.toBe(0);
  });

  it('--update merges a folder generator per file, keeping local edits', () => {
    expect(
      runCommandResult('node', [cliEntry, 'eject-generator', 'php'], { testPath: project }).status
    ).toBe(0);
    appendFileSync(join(project, 'generators/php/index.ts'), '// my local customization\n');
    appendFileSync(join(project, 'generators/php/naming.ts'), '// naming tweak\n');
    // The skill is edit-first too — an update must merge around a design note, not drop it.
    const skillPath = join(project, '.claude/skills/php-generator/SKILL.md');
    appendFileSync(skillPath, '\n## Our fork\n\nWe keep the legacy auth header.\n');
    const clean = runCommandResult('node', [cliEntry, 'eject-generator', 'php', '--update'], {
      testPath: project,
    });
    expect(clean.status, clean.stderr).toBe(0);
    expect(readFileSync(join(project, 'generators/php/index.ts'), 'utf-8')).toContain(
      '// my local customization'
    );
    expect(readFileSync(join(project, 'generators/php/naming.ts'), 'utf-8')).toContain(
      '// naming tweak'
    );
    expect(readFileSync(skillPath, 'utf-8')).toContain('We keep the legacy auth header.');
  });

  it('--update keeps a local edit, and a legacy single-file eject says to re-eject', () => {
    expect(
      runCommandResult('node', [cliEntry, 'eject-generator', 'zod'], { testPath: project }).status
    ).toBe(0);
    const indexFile = join(project, 'generators/zod/index.ts');
    const base = readFileSync(indexFile, 'utf-8').split('\n');
    const mine = [...base];
    mine[1] = '// USER edited line where the update also changes';
    writeFileSync(indexFile, mine.join('\n'), 'utf-8');
    // Simulate the shipped file changing on the SAME line the user edited: point the
    // user's copy at the current version but alter the line, then update — the header
    // version equals the toolkit version, so the asset itself is the base and the edit
    // survives cleanly; a conflict needs a diverged base, covered by the unit tests.
    const clean = runCommandResult('node', [cliEntry, 'eject-generator', 'zod', '--update'], {
      testPath: project,
    });
    expect(clean.status, clean.stderr).toBe(0);
    expect(readFileSync(indexFile, 'utf-8')).toContain('// USER edited line');

    // A single-file copy from an older CLI cannot merge into the folder shape — the
    // command says to eject fresh instead of guessing.
    copyFileSync(join(__dirname, 'legacy-mock.mjs'), join(project, 'generators/mock.mjs'));
    const legacy = runCommandResult('node', [cliEntry, 'eject-generator', 'mock', '--update'], {
      testPath: project,
    });
    expect(legacy.status).not.toBe(0);
    expect(legacy.stderr + legacy.stdout).toContain('--force');
  });
});

describe('eject-generator from source (no bundle)', () => {
  // The command reads its assets beside the bundle, which only the CLI build produces.
  // It must also find them when it runs from `packages/cli/src`, as `npm run cli` does.
  it('ejects every generator when the CLI runs from src', async () => {
    const project = makeProject();
    try {
      for (const generator of ['python', 'go', 'php', 'java', 'typescript', 'cli']) {
        const result = await runTsx(
          join(repoRoot, 'packages/cli/src/index.ts'),
          ['eject-generator', generator],
          { cwd: project }
        );
        expect(result.status, `${generator}: ${result.stdout}\n${result.stderr}`).toBe(0);
        expect(existsSync(join(project, `generators/${generator}/index.ts`))).toBe(true);
      }
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  }, 30_000);
});

import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { repoRoot, runGenerateClient } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const examplesDir = join(__dirname, 'examples');

// The one example whose generated client stays committed (its README sells the single
// self-contained file). CI regenerates and type-checks the others.
const COMMITTED = 'zero-install-quickstart';

/** All files (relative paths) under a dir, recursively. */
function listFiles(dir: string, base = dir): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(full, base));
    } else {
      files.push(full.slice(base.length + 1));
    }
  }
  return files;
}

describe('the committed example client is current', () => {
  it(`${COMMITTED}/src/api matches a fresh generation`, () => {
    const exampleDir = join(examplesDir, COMMITTED);
    const tmp = mkdtempSync(join(tmpdir(), `ex-${COMMITTED}-`));
    try {
      const result = runGenerateClient([COMMITTED, '--output', join(tmp, 'client.ts')], exampleDir);
      expect(result.status, result.stderr).toBe(0);

      const committed = join(exampleDir, 'src/api');
      const committedFiles = listFiles(committed).sort();
      expect(listFiles(tmp).sort(), 'the generated file set differs').toEqual(committedFiles);
      for (const relativePath of committedFiles) {
        expect(
          readFileSync(join(tmp, relativePath), 'utf-8'),
          `${COMMITTED}/src/api/${relativePath} is stale — run \`npm run examples:regen -w @redocly/client-generator\``
        ).toBe(readFileSync(join(committed, relativePath), 'utf-8'));
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  }, 60_000);
});

describe('the ejected example carries the current skills', () => {
  // The example commits what `redocly eject-generator` drops, so a browser sees the
  // whole story; these pin the committed copies to the shipped assets.
  const shippedSkill = (skill: string) =>
    readFileSync(
      join(repoRoot, 'packages/client-generator/eject-assets/skills', skill, 'SKILL.md'),
      'utf-8'
    );
  const exampleDir = join(examplesDir, 'ejected-generator');

  it.each(['client-generators', 'php-generator'])(
    '%s/SKILL.md matches the shipped skill',
    (skill) => {
      const committed = readFileSync(
        join(exampleDir, '.claude/skills', skill, 'SKILL.md'),
        'utf-8'
      );
      expect(committed, 'stale — re-run `redocly eject-generator` in the example').toBe(
        shippedSkill(skill)
      );
    }
  );

  it('generators/AGENTS.md points at both skills', () => {
    const pointer = readFileSync(join(exampleDir, 'generators/AGENTS.md'), 'utf-8');
    expect(pointer).toContain('redocly-generators:begin');
    expect(pointer).toContain('.claude/skills/client-generators/SKILL.md');
    expect(pointer).toContain('.claude/skills/php-generator/SKILL.md');
  });
});

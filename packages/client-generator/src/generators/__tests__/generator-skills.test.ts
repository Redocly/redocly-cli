import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The prepare-time transform that rewrites the repo-facing intro and modify loop
// into their user-repo equivalents (plain .mjs, importable straight from scripts/).
import { ejectedSkill } from '../../../scripts/ejected-skill.mjs';

// Skill-first development: EVERY generator lives in a folder with its own AGENTS.md —
// the design the code must match. A generator folder without a skill, or a skill
// missing its modify-loop anchors, fails here.
const generatorsDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Generators whose whole implementation is one file, so eject ships them. */
const EJECTABLE = ['python', 'go', 'php'];
/** TypeScript-emitting generators: thin entries over the shared emitters. */
const TYPESCRIPT = ['sdk', 'zod', 'mock', 'cli', 'swr', 'tanstack-query', 'transformers'];

describe.each([...EJECTABLE, ...TYPESCRIPT])('%s generator skill', (name) => {
  const skillPath = join(generatorsDir, name, 'AGENTS.md');

  it('exists next to the generator', () => {
    expect(existsSync(skillPath)).toBe(true);
  });

  it('states the skill-first rule and how to verify a change', () => {
    const skill = readFileSync(skillPath, 'utf-8');
    expect(skill).toContain('edit this skill first');
    expect(skill).toContain('## The modify loop');
    expect(skill).toContain('large-descriptions.test.ts');
  });
});

describe.each(EJECTABLE)('%s generator skill ships to users', (name) => {
  const skillPath = join(generatorsDir, name, 'AGENTS.md');

  it('names its runtime', () => {
    expect(readFileSync(skillPath, 'utf-8')).toContain(`${name}-runtime/`);
  });

  it('is what eject ships — the prepared skill is the user-repo transform of the source', () => {
    // `prepare` rewrites the skill for the user's repo (their file is generators/<name>.mjs,
    // their loop is regenerate + diff — not this repo's index.ts/prepare/vitest loop);
    // commit-time formatting of the source AFTER a prepare run would ship a stale copy.
    const asset = join(generatorsDir, '../../eject-assets/skills', `${name}-generator`, 'SKILL.md');
    const shipped = readFileSync(asset, 'utf-8');
    expect(shipped).toBe(ejectedSkill(readFileSync(skillPath, 'utf-8'), name));
    // Eject drops it as an agent skill, so it carries the frontmatter a skill needs.
    expect(shipped.startsWith(`---\nname: ${name}-generator\ndescription: `)).toBe(true);
    expect(shipped).toContain(`generators/${name}.mjs`);
    expect(shipped).not.toContain('index.ts');
    expect(shipped).not.toContain('npm run prepare');
    expect(shipped).not.toContain('vitest');
  });
});

describe.each(TYPESCRIPT)('%s generator skill (not ejectable)', (name) => {
  it('points at the emitters that implement it and at the customization path', () => {
    const skill = readFileSync(join(generatorsDir, name, 'AGENTS.md'), 'utf-8');
    expect(skill).toContain('## Emitters that implement it');
    expect(skill).toContain('Not ejectable');
  });
});

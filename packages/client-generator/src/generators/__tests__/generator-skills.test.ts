import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The prepare-time transform that rewrites the repo-facing intro and modify loop
// into their user-repo equivalents (plain .mjs, importable straight from scripts/).
import { ejectedSkill } from '../../../scripts/ejected-skill.mjs';

// Skill-first development: every language generator lives in a folder with its own
// AGENTS.md — the design the code must match (and the file eject ships to users).
// A generator folder without a skill, or a skill missing its modify-loop anchors,
// fails here.
const generatorsDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

describe.each(['python', 'go', 'php'])('%s generator skill', (name) => {
  const skillPath = join(generatorsDir, name, 'AGENTS.md');

  it('exists next to the generator', () => {
    expect(existsSync(skillPath)).toBe(true);
  });

  it('names its runtime, the skill-first rule, and the verify loop', () => {
    const skill = readFileSync(skillPath, 'utf-8');
    expect(skill).toContain(`${name}-runtime/`);
    expect(skill).toContain('edit this skill first');
    expect(skill).toContain('large-descriptions.test.ts');
  });

  it('is what eject ships — the prepared asset is the user-repo transform of the source', () => {
    // `prepare` rewrites the skill for the user's repo (their file is generators/<name>.mjs,
    // their loop is regenerate + diff — not this repo's index.ts/prepare/vitest loop);
    // commit-time formatting of the source AFTER a prepare run would ship a stale copy.
    const asset = join(generatorsDir, '../../eject-assets/generators', `${name}.AGENTS.md`);
    const shipped = readFileSync(asset, 'utf-8');
    expect(shipped).toBe(ejectedSkill(readFileSync(skillPath, 'utf-8'), name));
    expect(shipped).toContain(`generators/${name}.mjs`);
    expect(shipped).not.toContain('index.ts');
    expect(shipped).not.toContain('npm run prepare');
    expect(shipped).not.toContain('vitest');
  });
});

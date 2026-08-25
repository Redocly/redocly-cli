import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The prepare-time transform that rewrites the repo-facing intro and modify loop
// into their user-repo equivalents (importable straight from scripts/).
import { ejectedSkill } from '../../../scripts/ejected-skill.mjs';

// Skill-first development: EVERY generator lives in a folder with its own AGENTS.md —
// the design the code must match. A generator folder without a skill, or a skill
// missing its modify-loop anchors, fails here.
const generatorsDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Every generator: a self-contained folder, ejected as its own source. */
const EJECTABLE = [
  'python',
  'go',
  'php',
  'typescript',
  'zod',
  'mock',
  'cli',
  'swr',
  'tanstack-query',
  'transformers',
];

describe.each(EJECTABLE)('%s generator skill', (name) => {
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
  it('ships without repo-only references — the user has no prepare script or vitest', () => {
    const asset = join(generatorsDir, '../../eject-assets/skills', `${name}-generator`, 'SKILL.md');
    const shipped = readFileSync(asset, 'utf-8');
    expect(shipped).toContain(`generators/${name}/`);
    expect(shipped).not.toContain('npm run prepare');
    expect(shipped).not.toContain('vitest');
  });
});

describe.each(EJECTABLE)('%s ships an eject asset', (name) => {
  const assetsDir = join(generatorsDir, '../../eject-assets');
  // Every generator ships as its source folder, entry index.ts.
  const assetEntry = join(assetsDir, 'generators', name, 'index.ts');

  it('has a generator asset and a skill beside it', () => {
    expect(existsSync(assetEntry)).toBe(true);
    const skill = readFileSync(join(assetsDir, 'skills', `${name}-generator`, 'SKILL.md'), 'utf-8');
    expect(skill.startsWith(`---\nname: ${name}-generator\ndescription: `)).toBe(true);
  });

  it('ships the skill fresh — the committed copy is the transform of the source', () => {
    // `prepare` rewrites the skill for the user's repo; a hand edit to the shipped copy,
    // or a source edit without a prepare run, would ship (and commit) a stale skill.
    const shipped = readFileSync(
      join(assetsDir, 'skills', `${name}-generator`, 'SKILL.md'),
      'utf-8'
    );
    const source = readFileSync(join(generatorsDir, name, 'AGENTS.md'), 'utf-8');
    expect(shipped).toBe(ejectedSkill(source, name));
  });

  it('declares the default export the resolver loads, with a version range', () => {
    const asset = readFileSync(assetEntry, 'utf-8');
    expect(asset).toMatch(new RegExp(`name: ['"]${name}['"]`));
    expect(asset).toMatch(/requiresGenerator: ['"]\^\d+\.\d+\.\d+['"]/);
    expect(asset).toContain('Ejected from @redocly/client-generator@');
  });
});

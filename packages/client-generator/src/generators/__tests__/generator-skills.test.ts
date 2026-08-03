import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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
    expect(skill).toContain('npm run harness');
  });

  it('is what eject ships — the prepared asset matches the source byte-for-byte', () => {
    // `prepare` copies the skill into eject-assets; commit-time formatting of the
    // source AFTER a prepare run would silently ship a stale copy without this pin.
    const asset = join(generatorsDir, '../../eject-assets/generators', `${name}.AGENTS.md`);
    expect(readFileSync(asset, 'utf-8')).toBe(readFileSync(skillPath, 'utf-8'));
  });
});

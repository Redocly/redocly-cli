import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The ejected-generator example commits what `redocly eject-generator` writes, so a reader
// sees the whole result. These tests keep the committed copies equal to the shipped assets.
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const exampleDir = join(packageRoot, 'examples/ejected-generator');

describe('the ejected-generator example', () => {
  it.each(['client-generators', 'php-generator'])('carries the shipped %s skill', (skill) => {
    const shipped = readFileSync(
      join(packageRoot, 'eject-assets/skills', skill, 'SKILL.md'),
      'utf-8'
    );
    const committed = readFileSync(join(exampleDir, '.claude/skills', skill, 'SKILL.md'), 'utf-8');
    expect(committed, 'stale: re-run `redocly eject-generator` in the example').toBe(shipped);
  });

  it('points at both skills from generators/AGENTS.md', () => {
    const pointer = readFileSync(join(exampleDir, 'generators/AGENTS.md'), 'utf-8');
    expect(pointer).toContain('redocly-generators:begin');
    expect(pointer).toContain('.claude/skills/client-generators/SKILL.md');
    expect(pointer).toContain('.claude/skills/php-generator/SKILL.md');
  });
});

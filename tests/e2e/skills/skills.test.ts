import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { getCommandOutput, getParams } from '../helpers.js';

const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');

describe('skills', () => {
  let home: string;
  let project: string;

  function runSkills(args: string[] = []) {
    return getCommandOutput(getParams(indexEntryPoint, ['skills', ...args]), {
      testPath: project,
      env: {
        HOME: home,
        CLAUDE_CONFIG_DIR: join(home, '.claude'),
        XDG_CONFIG_HOME: join(home, '.config'),
        REDOCLY_TELEMETRY: 'off',
      },
    });
  }

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'skills-home-'));
    project = mkdtempSync(join(tmpdir(), 'skills-project-'));
  });

  afterEach(() => {
    rmSync(home, { recursive: true, force: true });
    rmSync(project, { recursive: true, force: true });
  });

  test('installs only into .agents/skills when no agent is detected', () => {
    const listOutput = runSkills(['--list']);
    expect(listOutput).toContain('redocly-lint-rules');
    expect(readdirSync(project)).toEqual([]);

    const output = runSkills();
    expect(readdirSync(join(project, '.agents/skills')).sort()).toEqual([
      'recheck-config',
      'recheck-lint',
      'redocly-cli',
      'redocly-lint-rules',
    ]);
    expect(readdirSync(project)).toEqual(['.agents']);
    expect(output).toContain('created   .agents/skills/redocly-cli/SKILL.md');
    expect(output).toContain('redocly skills --agent claude');
  });

  test('adds .claude/skills when Claude Code is installed and keeps other skills on rerun', () => {
    mkdirSync(join(home, '.claude'));
    runSkills();
    expect(existsSync(join(project, '.claude/skills/redocly-cli/SKILL.md'))).toBe(true);

    const teamSkill = join(project, '.claude/skills/team-skill/SKILL.md');
    mkdirSync(join(project, '.claude/skills/team-skill'));
    writeFileSync(teamSkill, 'team');

    const output = runSkills();
    expect(output).not.toContain('created');
    expect(output).not.toContain('updated');
    expect(output).toContain('All skills are up to date.');
    expect(existsSync(teamSkill)).toBe(true);
  });

  test('creates the folder of an agent named with --agent', () => {
    runSkills(['--agent', 'windsurf']);
    expect(existsSync(join(project, '.windsurf/skills/redocly-cli/SKILL.md'))).toBe(true);
    expect(existsSync(join(project, '.agents/skills/redocly-cli/SKILL.md'))).toBe(true);
  });
});

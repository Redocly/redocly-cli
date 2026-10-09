import { HandledError, logger } from '@redocly/openapi-core';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { type CommandArgs } from '../wrapper.js';

export type SkillsArgv = {
  agent?: string[];
  global?: boolean;
  list?: boolean;
};

type OwnFolderAgent = {
  name: string;
  projectDir: string;
  homeDir: string;
};

const SHARED_SKILLS_DIR = join('.agents', 'skills');
const SHARED_FOLDER_AGENTS = ['codex', 'cursor', 'copilot', 'gemini', 'opencode'];

const home = homedir();
const claudeHome = process.env.CLAUDE_CONFIG_DIR || join(home, '.claude');
const configHome = process.env.XDG_CONFIG_HOME || join(home, '.config');

// Folder names follow the agent registry of the `skills` CLI (github.com/vercel-labs/skills).
const OWN_FOLDER_AGENTS: OwnFolderAgent[] = [
  { name: 'claude', projectDir: '.claude', homeDir: claudeHome },
  { name: 'windsurf', projectDir: '.windsurf', homeDir: join(home, '.codeium', 'windsurf') },
  { name: 'kiro', projectDir: '.kiro', homeDir: join(home, '.kiro') },
  { name: 'continue', projectDir: '.continue', homeDir: join(home, '.continue') },
  { name: 'roo', projectDir: '.roo', homeDir: join(home, '.roo') },
  { name: 'goose', projectDir: '.goose', homeDir: join(configHome, 'goose') },
  { name: 'junie', projectDir: '.junie', homeDir: join(home, '.junie') },
  { name: 'augment', projectDir: '.augment', homeDir: join(home, '.augment') },
];

export const SKILLS_AGENTS: string[] = [...SHARED_FOLDER_AGENTS];
for (const agent of OWN_FOLDER_AGENTS) {
  SKILLS_AGENTS.push(agent.name);
}

export async function handleSkills({ argv }: CommandArgs<SkillsArgv>) {
  const skillsDir = bundledSkillsDir();
  const skillNames = readdirSync(skillsDir);

  if (argv.list) {
    listSkills(skillsDir, skillNames);
    return;
  }

  const cwd = process.cwd();
  const baseDir = argv.global ? home : cwd;
  const targetDirs = [join(baseDir, SHARED_SKILLS_DIR)];
  for (const agent of OWN_FOLDER_AGENTS) {
    if (!isAgentSelected(agent, argv, cwd)) {
      continue;
    }
    if (argv.global) {
      targetDirs.push(join(agent.homeDir, 'skills'));
    } else {
      targetDirs.push(join(cwd, agent.projectDir, 'skills'));
    }
  }

  let changed = 0;
  for (const targetDir of targetDirs) {
    for (const skillName of skillNames) {
      const bundled = readFileSync(join(skillsDir, skillName, 'SKILL.md'), 'utf-8');
      const targetFile = join(targetDir, skillName, 'SKILL.md');
      const shownPath = argv.global ? targetFile : relative(cwd, targetFile);

      let status = 'created';
      if (existsSync(targetFile)) {
        status = readFileSync(targetFile, 'utf-8') === bundled ? 'unchanged' : 'updated';
      }
      if (status !== 'unchanged') {
        mkdirSync(join(targetDir, skillName), { recursive: true });
        writeFileSync(targetFile, bundled, 'utf-8');
        changed++;
      }
      logger.output(`${status.padEnd(10)}${shownPath}\n`);
    }
  }

  logger.output('\n');
  if (changed === 0) {
    logger.output('All skills are up to date.\n');
  }
  logger.output(
    `Codex, Cursor, GitHub Copilot, Gemini CLI, OpenCode, and other agents read ${SHARED_SKILLS_DIR}.\n`
  );
  if (!argv.agent && targetDirs.length === 1) {
    logger.output(
      'To install for an agent with its own folder, such as Claude Code, run: redocly skills --agent claude\n'
    );
  }
}

function listSkills(skillsDir: string, skillNames: string[]) {
  for (const skillName of skillNames) {
    const content = readFileSync(join(skillsDir, skillName, 'SKILL.md'), 'utf-8');
    const description = content.match(/^description: (.*)$/m);
    logger.output(`${skillName}\n  ${description ? description[1] : ''}\n\n`);
  }
}

function isAgentSelected(agent: OwnFolderAgent, argv: SkillsArgv, cwd: string): boolean {
  if (argv.agent) {
    return argv.agent.includes(agent.name);
  }
  if (existsSync(agent.homeDir)) {
    return true;
  }
  return !argv.global && existsSync(join(cwd, agent.projectDir));
}

/** Beside the bundle in the published package; in `lib/` when you run the CLI from `src`. */
function bundledSkillsDir(): string {
  const candidates = [
    new URL('./skills/', import.meta.url),
    new URL('../../lib/skills/', import.meta.url),
  ];
  for (const candidate of candidates) {
    const dir = fileURLToPath(candidate);
    if (existsSync(dir)) {
      return dir;
    }
  }
  throw new HandledError(
    'The bundled agent skills are missing. In a checkout of the CLI, run: npm run compile'
  );
}

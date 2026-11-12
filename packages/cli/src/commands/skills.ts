import { logger } from '@redocly/openapi-core';
import { bold, cyan, gray, green, yellow } from 'colorette';
import { existsSync, lstatSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { bundledSkills } from '../utils/package.js';
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

export const SKILLS_AGENTS: string[] = [
  ...SHARED_FOLDER_AGENTS,
  ...OWN_FOLDER_AGENTS.map((agent) => agent.name),
];

export async function handleSkills({ argv }: CommandArgs<SkillsArgv>) {
  if (argv.list) {
    listSkills();
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
    const shownDir = argv.global ? targetDir : relative(cwd, targetDir);
    // `lstatSync` sees a broken link, `statSync` follows a working link to its folder.
    const entry = lstatSync(targetDir, { throwIfNoEntry: false });
    const linkTarget = statSync(targetDir, { throwIfNoEntry: false });
    if (entry && !linkTarget?.isDirectory()) {
      logger.warn(`Skipped ${shownDir} because it is not a folder.\n`);
      continue;
    }

    for (const skillName of bundledSkills) {
      const bundled = readSkill(skillName);
      const targetFile = join(targetDir, skillName, 'SKILL.md');
      const shownPath = join(shownDir, skillName, 'SKILL.md');

      let status = 'created';
      let color = green;
      if (existsSync(targetFile)) {
        if (readFileSync(targetFile, 'utf-8') === bundled) {
          status = 'unchanged';
          color = gray;
        } else {
          status = 'updated';
          color = yellow;
        }
      }
      if (status !== 'unchanged') {
        mkdirSync(join(targetDir, skillName), { recursive: true });
        writeFileSync(targetFile, bundled, 'utf-8');
        changed++;
      }
      logger.output(`${color(status.padEnd(10))}${shownPath}\n`);
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

function readSkill(skillName: string): string {
  return readFileSync(fileURLToPath(import.meta.resolve(`#skills/${skillName}/SKILL.md`)), 'utf-8');
}

function listSkills() {
  const width = Math.min(process.stdout.columns || 80, 100) - 4;
  for (const skillName of bundledSkills) {
    const content = readSkill(skillName);
    const description = content.match(/^description: (.*)$/m);
    logger.output(`${bold(cyan(skillName))}\n`);

    let line = '';
    for (const word of (description ? description[1] : '').split(' ')) {
      if (line && line.length + word.length + 1 > width) {
        logger.output(`    ${line}\n`);
        line = word;
      } else {
        line = line ? `${line} ${word}` : word;
      }
    }
    logger.output(`    ${line}\n\n`);
  }
  logger.output(`To install the skills, run: ${bold('redocly skills')}\n`);
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

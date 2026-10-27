import { logger } from '@redocly/openapi-core';
import { cyan } from 'colorette';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

import { renderBanner } from './banner.js';
import { SHOULD_NOT_NOTIFY } from './update-version-notifier.js';

// Each user sees an announcement once. Give a new announcement a new `id`.
const ANNOUNCEMENT = {
  id: 'agent-skills',
  lines: [
    `${cyan('Redocly CLI')} comes with skills for AI coding agents:`,
    '',
    `  ${cyan('redocly-cli')}         lint, bundle, build docs, test, and more`,
    `  ${cyan('redocly-lint-rules')}  write lint rules and plugins`,
    `  ${cyan('recheck-lint')}        lint the Markdown that the agent changed`,
    `  ${cyan('recheck-config')}      set up recheck in redocly.yaml`,
    '',
    `Install them in your project: \`${cyan('redocly skills')}\`.`,
    'Docs: https://redocly.com/docs/cli/commands/skills',
  ],
};

const SHOWN_ANNOUNCEMENT_FILE = join(homedir(), '.redocly', 'announcement');

export const showAnnouncement = () => {
  // Each Docker run starts with an empty home folder, so the announcement would show every time.
  if (SHOULD_NOT_NOTIFY || process.env.REDOCLY_ENVIRONMENT === 'docker') {
    return;
  }
  try {
    if (
      existsSync(SHOWN_ANNOUNCEMENT_FILE) &&
      readFileSync(SHOWN_ANNOUNCEMENT_FILE, 'utf-8') === ANNOUNCEMENT.id
    ) {
      return;
    }
    mkdirSync(dirname(SHOWN_ANNOUNCEMENT_FILE), { recursive: true });
    writeFileSync(SHOWN_ANNOUNCEMENT_FILE, ANNOUNCEMENT.id);
  } catch {
    // Without the record, the announcement would show on every run.
    return;
  }
  logger.info(renderBanner(ANNOUNCEMENT.lines));
};

import { logger } from '@redocly/openapi-core';
import { cyan, green } from 'colorette';
import { existsSync, mkdirSync, writeFileSync, readFileSync, statSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import * as process from 'node:process';
import { compare, valid } from 'semver';

import { renderBanner } from './banner.js';
import { DEFAULT_FETCH_TIMEOUT } from './constants.js';
import { cleanColors } from './miscellaneous.js';
import { version, name } from './package.js';

// Each user sees an announcement once, until its text changes.
const ANNOUNCEMENT = [
  `${cyan('Redocly CLI')} comes with skills for AI coding agents:`,
  '',
  `  ${cyan('redocly-cli')}         lint, bundle, build docs, test, and more`,
  `  ${cyan('redocly-lint-rules')}  write lint rules and plugins`,
  `  ${cyan('recheck-lint')}        lint the Markdown that the agent changed`,
  `  ${cyan('recheck-config')}      set up recheck in redocly.yaml`,
  '',
  `Install them in your project: \`${cyan('redocly skills')}\`.`,
  'Docs: https://redocly.com/docs/cli/commands/skills',
];
// Without colors, because a run without color support would record different text.
const ANNOUNCEMENT_TEXT = cleanColors(ANNOUNCEMENT.join('\n'));

const VERSION_CACHE_FILE = 'redocly-cli-version';
const SHOWN_ANNOUNCEMENT_FILE = join(homedir(), '.redocly', 'announcement');
const INTERVAL_TO_CHECK = 1000 * 60 * 60 * 12;
const SHOULD_NOT_NOTIFY =
  process.env.NODE_ENV === 'test' ||
  process.env.CI ||
  !process.stderr.isTTY ||
  !!process.env.LAMBDA_TASK_ROOT ||
  process.env.REDOCLY_SUPPRESS_UPDATE_NOTICE === 'true';

// The announcement waits until the CLI is up to date.
export const notify = () => {
  if (SHOULD_NOT_NOTIFY) {
    return;
  }
  const latestVersion = valid(readFileIfExists(join(tmpdir(), VERSION_CACHE_FILE)));
  if (latestVersion && isNewVersionAvailable(version, latestVersion)) {
    showUpdateBanner(latestVersion);
  } else if (readFileIfExists(SHOWN_ANNOUNCEMENT_FILE) !== ANNOUNCEMENT_TEXT) {
    showAnnouncementBanner();
  }
};

const readFileIfExists = (path: string): string | undefined => {
  try {
    return readFileSync(path, 'utf-8');
  } catch {
    return undefined;
  }
};

const showUpdateBanner = (latest: string) => {
  logger.info(
    renderBanner([
      `A new version of ${cyan('Redocly CLI')} (${green(latest)}) is available.`,
      `Update now: \`${cyan('npm i -g @redocly/cli@latest')}\`.`,
      `Changelog: https://redocly.com/docs/cli/changelog/`,
    ])
  );
};

const showAnnouncementBanner = () => {
  try {
    mkdirSync(dirname(SHOWN_ANNOUNCEMENT_FILE), { recursive: true });
    writeFileSync(SHOWN_ANNOUNCEMENT_FILE, ANNOUNCEMENT_TEXT);
  } catch {
    // Without the record, the announcement would show on every run.
    return;
  }
  logger.info(renderBanner(ANNOUNCEMENT));
};

const isNewVersionAvailable = (current: string, latest: string) => compare(current, latest) < 0;

const getLatestVersion = async (packageName: string): Promise<string | undefined> => {
  const latestUrl = `https://registry.npmjs.org/${packageName}/latest`;

  try {
    const { fetchWithTimeout } = await import('./fetch-with-timeout.js');
    const response = await fetchWithTimeout(latestUrl, { timeout: DEFAULT_FETCH_TIMEOUT });
    const info = await response.json();

    return info.version;
  } catch {
    // Do nothing
    return;
  }
};

export const cacheLatestVersion = () => {
  if (!isNeedToBeCached() || SHOULD_NOT_NOTIFY) {
    return;
  }

  getLatestVersion(name)
    .then((version) => {
      if (version) {
        const lastCheckFile = join(tmpdir(), VERSION_CACHE_FILE);
        writeFileSync(lastCheckFile, version);
      }
    })
    .catch(() => {});
};

const isNeedToBeCached = (): boolean => {
  try {
    // Last version from npm is stored in a file in the OS temp folder
    const versionFile = join(tmpdir(), VERSION_CACHE_FILE);

    if (!existsSync(versionFile)) {
      return true;
    }

    const now = new Date().getTime();
    const stats = statSync(versionFile);
    const lastCheck = stats.mtime.getTime();

    return now - lastCheck >= INTERVAL_TO_CHECK;
  } catch (e) {
    return false;
  }
};

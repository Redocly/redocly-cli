import { tmpdir } from 'os';
import { join } from 'path';
import { existsSync, writeFileSync, readFileSync, statSync } from 'fs';
import { compare } from 'semver';
import fetch from './fetch-with-timeout';
import { cyan, green, yellow } from 'colorette';
import { cleanColors } from './utils';

export const { version, name } = require('../package.json');

const VERSION_CACHE_FILE = 'redocly-cli-version';
const SPACE_TO_BORDER = 4;

const INTERVAL_TO_CHECK = 1000 * 60 * 60 * 12;
const SHOULD_NOT_NOTIFY =
  process.env.NODE_ENV === 'test' || process.env.CI || !!process.env.LAMBDA_TASK_ROOT;

export const notifyUpdateCliVersion = () => {
  if (SHOULD_NOT_NOTIFY) {
    return;
  }
  try {
    const latestVersion = readFileSync(join(tmpdir(), VERSION_CACHE_FILE)).toString();

    if (isNewVersionAvailable(version, latestVersion)) {
      renderUpdateBanner(version, latestVersion);
    }
  } catch (e) {
    return;
  }
};

const isNewVersionAvailable = (current: string, latest: string) => compare(current, latest) < 0;

const getLatestVersion = async (packageName: string): Promise<string | undefined> => {
  const latestUrl = `http://registry.npmjs.org/${packageName}/latest`;
  const response = await fetch(latestUrl);
  if (!response) return;
  const info = await response.json();
  return info.version;
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

const renderUpdateBanner = (current: string, latest: string) => {
  const messageLines = [
    `A new version of ${cyan('Redocly CLI')} (${green(latest)}) is available.`,
    `Update now: \`${cyan('npm i -g @redocly/cli@latest')}\`.`,
    `Changelog: https://redocly.com/docs/cli/changelog/`,
  ];
  const maxLength = Math.max(...messageLines.map((line) => cleanColors(line).length));

  const border = yellow('═'.repeat(maxLength + SPACE_TO_BORDER));

  const banner = `
    ${yellow('╔' + border + '╗')}
    ${yellow('║' + ' '.repeat(maxLength + SPACE_TO_BORDER) + '║')}
    ${messageLines
      .map((line, index) => {
        return getLineWithPadding(maxLength, line, index);
      })
      .join('\n')}
    ${yellow('║' + ' '.repeat(maxLength + SPACE_TO_BORDER) + '║')}
    ${yellow('╚' + border + '╝')}
  `;

  process.stderr.write(banner);
};

const getLineWithPadding = (maxLength: number, line: string, index: number): string => {
  const padding = ' '.repeat(maxLength - cleanColors(line).length);
  const extraSpaces = index !== 0 ? ' '.repeat(SPACE_TO_BORDER) : '';
  return `${extraSpaces}${yellow('║')}  ${line}${padding}  ${yellow('║')}`;
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

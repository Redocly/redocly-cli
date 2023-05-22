import * as chalk from 'chalk';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import * as semver from 'semver';
import fetch from 'node-fetch';
import { cleanColors } from './utils';

const { version, name } = require('../package.json');

const TIMESTAMP_FILE = 'redocly-cli-check-version';
const SPACE_TO_BORDER = 4;

// 12 hours
const INTERVAL_TO_CHECK = 1000; // * 60 * 60 * 12;

export const notifyUpdateCliVersion = async () => {
  if (!isNeedsToBeChecked()) {
    return;
  }

  try {
    const latestVersion = await getLatestVersion(name);

    if (isNewVersionAvailable(version, latestVersion)) {
      renderUpdateBanner(name, version, latestVersion);
    }
  } catch (e) {
    return;
  }
};

const isNewVersionAvailable = (current: string, latest: string) =>
  semver.compare(current, latest) < 0;

const getLatestVersion = async (packageName: string): Promise<string> => {
  const latestUrl = `http://registry.npmjs.org/${packageName}/latest`;
  const response = await fetch(latestUrl);
  const info = await response.json();
  return info.version;
};

const renderUpdateBanner = (packageName: string, current: string, latest: string) => {
  const messageLines = [
    `A new version of ${chalk.cyan('Redocly CLI')} (${chalk.green(latest)}) is available.`,
    `Update now: \`${chalk.cyan('npm i -g @redocly/cli@latest')}\`.`,
    `Changelog: https://redocly.com/docs/cli/changelog/`,
  ];
  const maxLength = Math.max(...messageLines.map((line) => cleanColors(line).length));

  const border = chalk.yellow('═'.repeat(maxLength + SPACE_TO_BORDER));

  const banner = `
    ${chalk.yellow('╔' + border + '╗')}
    ${chalk.yellow('║' + ' '.repeat(maxLength + SPACE_TO_BORDER) + '║')}
    ${messageLines
      .map((line, index) => {
        return getLineWithPadding(line, index);
      })
      .join('\n')}
    ${chalk.yellow('║' + ' '.repeat(maxLength + SPACE_TO_BORDER) + '║')}
    ${chalk.yellow('╚' + border + '╝')}
  `;

  process.stderr.write(banner);

  function getLineWithPadding(line: string, index: number): string {
    const padding = ' '.repeat(maxLength - cleanColors(line).length);
    const extraSpaces = index !== 0 ? ' '.repeat(SPACE_TO_BORDER) : '';
    return `${extraSpaces}${chalk.yellow('║')}  ${line}${padding}  ${chalk.yellow('║')}`;
  }
};

const isNeedsToBeChecked = (): boolean => {
  try {
    // Last check time is stored as a timestamp in a file in the OS temp folder
    const lastCheckFile = path.join(os.tmpdir(), TIMESTAMP_FILE);

    const now = new Date().getTime();

    if (!fs.existsSync(lastCheckFile)) {
      fs.writeFileSync(lastCheckFile, now.toString());
      return true;
    }
    const lastCheck = Number(fs.readFileSync(lastCheckFile).toString());

    // 12 hours period check
    if (now - lastCheck < INTERVAL_TO_CHECK) {
      return false;
    }

    fs.writeFileSync(lastCheckFile, now.toString());

    return true;
  } catch (e) {
    return false;
  }
};

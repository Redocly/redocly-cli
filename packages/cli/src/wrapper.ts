// eslint-disable-next-line @typescript-eslint/no-unused-vars
import fetch from 'node-fetch';
import { Config, RedoclyClient, Region, doesYamlFileExist } from '@redocly/openapi-core';
import type { Arguments } from 'yargs';
import { version } from './update-version-notifier';
import { exitWithError, loadConfigAndHandleErrors } from './utils';
import { lintConfigCallback } from './commands/lint';
import type { CommandOptions } from './types';
import * as process from "process";

export function commandWrapper<T extends CommandOptions>(
  commandHandler: (argv: T, config: Config, version: string) => Promise<void>
) {
  return async (argv: Arguments<T>) => {
    let code: 0 | 1 = 0;
    let telemetry;
    try {
      if (argv.config && !doesYamlFileExist(argv.config)) {
        return exitWithError('Please, provide valid path to the configuration file');
      }
      const config: Config = await loadConfigAndHandleErrors({
        configPath: argv.config,
        customExtends: argv.extends as string[] | undefined,
        region: argv.region as Region,
        files: argv.file as string[] | undefined,
        processRawConfig: lintConfigCallback(argv as T & Record<string, undefined>, version),
      });
      telemetry = config.telemetry;
      await commandHandler(argv, config, version);
    } catch (e) {
      code = 1;
    } finally {
      if (process.env.REDOCLY_ANALYTICS !== 'off' && telemetry !== 'off') {
        // TODO: Uncomment when we are ready to send analytics
        // await sendAnalytics(argv, code);
      }
      process.on('beforeExit', () => {
        process.exit(code);
      });
    }
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function sendAnalytics(argv: Arguments, exit_code: 0 | 1): Promise<void> {
  // FIXME: Disable for unit and e2e tests
  const {
    _: [command],
    $0: _,
    ...args
  } = argv;
  const event_time = new Date().toISOString();
  const node_version = process.version;
  const logged_in = await new RedoclyClient().isAuthorizedWithRedoclyByRegion();
  const data = {
    event: 'cli-command',
    event_time,
    logged_in,
    command,
    arguments: args,
    node_version,
    version,
    exit_code: exit_code,
  };
  await sendData(data);
}

type Analytics = {
  event: string;
  event_time: string;
  logged_in: boolean;
  command: string | number;
  arguments: Record<string, unknown>;
  node_version: string;
  version: string;
  exit_code: 0 | 1;
};

// FIXME: Use request function from @redocly/openapi-core
const sendData = async (data: Analytics) => {
  try {
    const response = await fetch('https://api.lab6.redocly.host/registry/telemetry/cli', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    console.log(response.status);
  } catch (e) {
    console.log(e);
  }
};

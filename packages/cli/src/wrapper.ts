// eslint-disable-next-line @typescript-eslint/no-unused-vars
import fetch from 'node-fetch';
import {
  Config,
  RedoclyClient,
  Region,
  doesYamlFileExist,
  isAbsoluteUrl,
} from '@redocly/openapi-core';
import type { Arguments } from 'yargs';
import { version } from './update-version-notifier';
import { exitWithError, loadConfigAndHandleErrors } from './utils';
import { lintConfigCallback } from './commands/lint';
import type { CommandOptions } from './types';

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
        await sendAnalytics(argv, code);
      }
      process.once('beforeExit', () => {
        process.exit(code);
      });
    }
  };
}

export async function sendAnalytics(argv: Arguments | undefined, exit_code: 0 | 1): Promise<void> {
  try {
    if (!argv) {
      return;
    }
    const {
      _: [command],
      $0: _,
      ...args
    } = argv;
    const event_time = new Date().toISOString();
    const redoclyClient = new RedoclyClient();
    const node_version = process.version;
    const logged_in = await redoclyClient.isAuthorizedWithRedoclyByRegion();
    const data: Analytics = {
      event: 'cli_command',
      event_time,
      logged_in,
      command,
      arguments: cleanArgs(args),
      node_version,
      version,
      exit_code: exit_code,
      environment: process.env.REDOCLY_ENVIRONMENT,
    };
    console.log(data);
    // FIXME: put an actual endpoint here
    await fetch(`https://api.lab6.redocly.host/registry/telemetry/cli`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  } catch (err) {
    // Do nothing.
  }
}

export type Analytics = {
  event: string;
  event_time: string;
  logged_in: boolean;
  command: string | number;
  arguments: Record<string, unknown>;
  node_version: string;
  version: string;
  exit_code: 0 | 1;
  environment?: string;
};

function cleanString(value?: string): string | undefined {
  if (!value) {
    return value;
  }
  if (isAbsoluteUrl(value)) {
    return value.split('://')[0] + '://***';
  }
  if (value.endsWith('.json') || value.endsWith('.yaml') || value.endsWith('.yml')) {
    return value.replace(/^(.*)\.(yaml|yml|json)$/gi, (_, __, ext) => '***.' + ext);
  }
  return value;
}

function cleanArgs(args: CommandOptions) {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (typeof value === 'string') {
      result[key] = cleanString(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map(cleanString);
    } else {
      result[key] = value;
    }
  }
  return result;
}

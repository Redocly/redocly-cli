// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Config, RedoclyClient, Region } from '@redocly/openapi-core';
import type { Arguments } from 'yargs';
import { version } from './update-version-notifier';
import { loadConfigAndHandleErrors } from './utils';
import { lintConfigCallback } from './commands/lint';
import { CommonOptions } from './types';
import fetch from "node-fetch";

export function commandWrapper<T extends CommonOptions>(cb: (argv: T, config: Config, version: string) => Promise<void>) {
  return async function (argv: Arguments<T>) {
    let code: 0 | 1 = 0;
    const config: Config = await loadConfigAndHandleErrors({
      configPath: argv.config,
      customExtends: argv.extends,
      region: argv.region as Region,
      files: argv.file as string[] | undefined,
      processRawConfig: lintConfigCallback(argv, version),
    });

    try {
      await cb(argv, config, version);
    } catch (e) {
      code = 1;
    }
    process.once('beforeExit', async () => {
      // TODO: handle errors from async function
      await sendAnalytics(argv, code, config.telemetry);
      process.exit(code);
    });
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function sendAnalytics(
  argv: Arguments,
  exit_code: 0 | 1 ,
  telemetry?: string
): Promise<void> {
  // FIXME: Disable for unit and e2e tests
  if (process.env.REDOCLY_ANALYTICS !== 'off' && telemetry !== 'off') {
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
    }
    await sendData(data);
  }
}

type Analytics = {
  event: string;
  event_time: string;
  logged_in: boolean;
  command: string | number;
  arguments: {[p: string]: unknown};
  node_version: string;
  version: string;
  exit_code: 0 | 1;
}

const sendData = async (data: Analytics) => {
  try {
    const response = await fetch('https://api.lab6.redocly.host/registry/telemetry/cli', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    console.log(response.status);
  } catch (e) {
    console.log(e);
  }
}
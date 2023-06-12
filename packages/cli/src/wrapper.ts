// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Config, RedoclyClient, Region } from '@redocly/openapi-core';
import type { Arguments } from 'yargs';
import { version } from './update-version-notifier';
import { loadConfigAndHandleErrors } from './utils';
import { lintConfigCallback } from './commands/lint';
import { CommonOptions } from './types';

export function commandWrapper<T>(cb: (argv: T, config: Config, version: string) => Promise<void>) {
  return async function (argv: Arguments<CommonOptions | T>) {
    let code: 0 | 1 = 0;
    const config: Config = await loadConfigAndHandleErrors({
      configPath: argv.config as string | undefined,
      customExtends: argv.extends as string[] | undefined,
      region: argv.region as Region,
      files: argv.file as string[] | undefined,
      processRawConfig: lintConfigCallback(argv as CommonOptions, version),
    });

    try {
      await cb(argv as T, config, version);
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
  exit_code?: number,
  telemetry?: string
): Promise<void> {
  // FIXME: Disable for unit and e2e tests
  // console.log('sendAnalytics', argv, exit_code)
  // if (process.env.REDOCLY_ANALYTICS !== 'off' && telemetry !== 'off') {
  //   const {
  //     _: [command],
  //     $0: _,
  //     ...args
  //   } = argv;
  //   const event_time = new Date().toISOString();
  //   const node_version = process.version;
  //   const logged_in = await new RedoclyClient().isAuthorizedWithRedoclyByRegion();
  //   console.log({
  //     event_type: 'cli-command',
  //     event_time,
  //     logged_in,
  //     command,
  //     arguments: args,
  //     node_version,
  //     version,
  //     exit_code: exit_code,
  //   });
  // }
}

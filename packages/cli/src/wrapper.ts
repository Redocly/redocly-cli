// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Config, RedoclyClient } from '@redocly/openapi-core';
import type { Arguments } from 'yargs';
import { version } from './update-version-notifier';
import { loadConfigAndHandleErrors } from './utils';
import { lintConfigCallback } from './commands/lint';

export function commandWrapper(cb: any) {
  return async function (argv: any, ...rest: unknown[]) {
    let code: 0 | 1 = 0;
    const config: Config = await loadConfigAndHandleErrors({
      configPath: argv.config,
      customExtends: argv.extends,
      region: argv.region,
      files: argv.files,
      processRawConfig: lintConfigCallback(argv, version),
    });

    try {
      await cb(argv, config, ...rest);
    } catch (e) {
      code = 1;
    }
    process.once('beforeExit', async () => {
      // TODO: handle errors from async function
      await sendAnalytics(argv, code);
      process.exit(code);
    });
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function sendAnalytics(argv: Arguments, exit_code?: number): Promise<void> {
  // FIXME: Disable for e2e tests
  // console.log('sendAnalytics', argv, exit_code)
  // if (process.env.REDOCLY_ANALYTICS !== 'off') {
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

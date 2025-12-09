import { getFallbackApisOrExit } from '../../utils/miscellaneous.js';
import { BaseResolver, bundle, logger } from '@redocly/openapi-core';
import { exitWithError } from '../../utils/error.js';
import { handleLoginAndFetchToken } from './auth/login-handler.js';
import { printScorecardResults } from './formatters/stylish-formatter.js';
import { fetchRemoteScorecardAndPlugins } from './remote/fetch-scorecard.js';
import { validateScorecard } from './validation/validate-scorecard.js';

import type { ScorecardClassicArgv } from './types.js';
import type { CommandArgs } from '../../wrapper.js';

export async function handleScorecardClassic({ argv, config }: CommandArgs<ScorecardClassicArgv>) {
  const [{ path }] = await getFallbackApisOrExit(argv.api ? [argv.api] : [], config);
  const externalRefResolver = new BaseResolver(config.resolve);
  const { bundle: document } = await bundle({ config, ref: path });
  const projectUrl = argv['project-url'] || config.resolvedConfig.scorecard?.fromProjectUrl;
  const apiKey = process.env.REDOCLY_AUTHORIZATION;

  if (!projectUrl) {
    exitWithError(
      'Scorecard is not configured. Please provide it via --project-url flag or configure it in redocly.yaml. Learn more: https://redocly.com/docs/realm/config/scorecard#fromprojecturl-example'
    );
  }

  const auth = apiKey || (await handleLoginAndFetchToken(config));

  if (!auth) {
    exitWithError('Failed to obtain access token or API key.');
  }

  const remoteScorecardAndPlugins = await fetchRemoteScorecardAndPlugins(projectUrl, auth);

  const scorecard = remoteScorecardAndPlugins?.scorecard;
  if (!scorecard) {
    exitWithError(
      'No scorecard configuration found. Please configure scorecard in your redocly.yaml or ensure remote scorecard is accessible.'
    );
  }

  logger.info(`\nRunning Scorecard Classic...\n`);
  const result = await validateScorecard(
    document,
    externalRefResolver,
    scorecard,
    config.configPath,
    remoteScorecardAndPlugins?.plugins
  );

  printScorecardResults(result, path);
}

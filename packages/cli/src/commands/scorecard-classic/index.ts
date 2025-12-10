import { formatPath, getExecutionTime, getFallbackApisOrExit } from '../../utils/miscellaneous.js';
import { BaseResolver, bundle, logger } from '@redocly/openapi-core';
import { exitWithError } from '../../utils/error.js';
import { handleLoginAndFetchToken } from './auth/login-handler.js';
import { printScorecardResults } from './formatters/stylish-formatter.js';
import { printScorecardResultsAsJson } from './formatters/json-formatter.js';
import { fetchRemoteScorecardAndPlugins } from './remote/fetch-scorecard.js';
import { validateScorecard } from './validation/validate-scorecard.js';
import { blue, gray, green } from 'colorette';

import type { ScorecardClassicArgv } from './types.js';
import type { CommandArgs } from '../../wrapper.js';

export async function handleScorecardClassic({ argv, config }: CommandArgs<ScorecardClassicArgv>) {
  const startedAt = performance.now();
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

  const remoteScorecardAndPlugins = await fetchRemoteScorecardAndPlugins(
    projectUrl,
    auth,
    !!apiKey
  );

  logger.info(gray(`\nRunning scorecard for ${formatPath(path)}...\n`));
  const result = await validateScorecard(
    document,
    externalRefResolver,
    remoteScorecardAndPlugins.scorecard!,
    config.configPath,
    remoteScorecardAndPlugins?.plugins
  );

  if (result.length === 0) {
    logger.output(
      green(
        `✅ No issues found for ${blue(
          formatPath(path)
        )}. Your API meets all scorecard requirements.\n`
      )
    );
    return;
  }

  if (argv.format === 'json') {
    printScorecardResultsAsJson(result);
  } else {
    printScorecardResults(result);
  }

  const elapsed = getExecutionTime(startedAt);
  logger.info(
    `📊 Scorecard results for ${blue(formatPath(path))} at ${blue(path || 'stdout')} ${green(
      elapsed
    )}.\n`
  );
}

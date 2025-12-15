import { formatPath, getExecutionTime, getFallbackApisOrExit } from '../../utils/miscellaneous.js';
import { BaseResolver, logger } from '@redocly/openapi-core';
import { AbortFlowError, exitWithError } from '../../utils/error.js';
import { handleLoginAndFetchToken } from './auth/login-handler.js';
import { printScorecardResults } from './formatters/stylish-formatter.js';
import { printScorecardResultsAsJson } from './formatters/json-formatter.js';
import { fetchRemoteScorecardAndPlugins } from './remote/fetch-scorecard.js';
import { validateScorecard } from './validation/validate-scorecard.js';
import { blue, bold, cyan, gray, green, white } from 'colorette';

import type { ScorecardClassicArgv } from './types.js';
import type { CommandArgs } from '../../wrapper.js';
import type { Document } from '@redocly/openapi-core';

export async function handleScorecardClassic({
  argv,
  config,
  version,
}: CommandArgs<ScorecardClassicArgv>) {
  const startedAt = performance.now();
  const [{ path }] = await getFallbackApisOrExit(argv.api ? [argv.api] : [], config);
  const externalRefResolver = new BaseResolver(config.resolve);
  const document = (await externalRefResolver.resolveDocument(null, path, true)) as Document;
  const targetLevel = argv['target-level'];

  const projectUrl =
    argv['project-url'] ||
    config.resolvedConfig.scorecardClassic?.fromProjectUrl ||
    config.resolvedConfig.scorecard?.fromProjectUrl;
  const apiKey = process.env.REDOCLY_AUTHORIZATION;

  if (argv.verbose) {
    logger.info(`Project URL: ${projectUrl || 'not configured'}\n`);
  }

  if (!projectUrl) {
    exitWithError(
      'Scorecard is not configured. Please provide it via --project-url flag or configure it in redocly.yaml. Learn more: https://redocly.com/docs/realm/config/scorecard#fromprojecturl-example'
    );
  }

  if (isNonInteractiveEnvironment() && !apiKey) {
    exitWithError(
      'Please provide an API key using the REDOCLY_AUTHORIZATION environment variable.\n'
    );
  }

  const auth = apiKey || (await handleLoginAndFetchToken(config, argv.verbose));

  if (!auth) {
    exitWithError('Failed to obtain access token or API key.');
  }

  const remoteScorecardAndPlugins = await fetchRemoteScorecardAndPlugins({
    projectUrl,
    auth,
    isApiKey: !!apiKey,
    verbose: argv.verbose,
  });

  logger.info(gray(`\nRunning scorecard for ${formatPath(path)}...\n`));
  const {
    problems: result,
    achievedLevel,
    targetLevelAchieved,
  } = await validateScorecard({
    document,
    externalRefResolver,
    scorecardConfig: remoteScorecardAndPlugins.scorecard!,
    configPath: config.configPath,
    pluginsCodeOrPlugins: remoteScorecardAndPlugins?.plugins,
    targetLevel,
    verbose: argv.verbose,
  });

  if (result.length === 0) {
    logger.output(white(bold(`\n ☑️  Achieved Level: ${cyan(achievedLevel)}\n`)));

    logger.output(
      green(
        `✅ No issues found for ${blue(
          formatPath(path)
        )}. Your API meets all scorecard requirements.\n`
      )
    );
    return;
  }

  if (targetLevel && !targetLevelAchieved) {
    logger.error(
      `\n❌ Your API specification does not satisfy the target scorecard level "${targetLevel}".\n`
    );
  }

  if (argv.format === 'json') {
    printScorecardResultsAsJson(result, achievedLevel, targetLevelAchieved, version);
  } else {
    printScorecardResults(result, achievedLevel, targetLevelAchieved);
  }

  const elapsed = getExecutionTime(startedAt);
  logger.info(
    `📊 Scorecard results for ${blue(formatPath(path))} at ${blue(path || 'stdout')} ${green(
      elapsed
    )}.\n`
  );

  if (targetLevel && !targetLevelAchieved) {
    throw new AbortFlowError('Target scorecard level not achieved.');
  } else if (achievedLevel !== 'Non Conformant') {
    return;
  }

  throw new AbortFlowError('Scorecard validation failed.');
}

function isNonInteractiveEnvironment(): boolean {
  if (process.env.CI || !process.stdin.isTTY) {
    return true;
  }

  return false;
}

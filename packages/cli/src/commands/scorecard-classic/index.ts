import { BaseResolver, logger, type Document } from '@redocly/openapi-core';
import { blue, bold, cyan, gray, green, white } from 'colorette';

import { AbortFlowError, exitWithError } from '../../utils/error.js';
import {
  formatPath,
  getExecutionTime,
  getFallbackApisOrExit,
  getAliasOrPath,
} from '../../utils/miscellaneous.js';
import type { CommandArgs } from '../../wrapper.js';
import { handleLoginAndFetchToken } from './auth/login-handler.js';
import { printScorecardResultsAsJson } from './formatters/json-formatter.js';
import { printScorecardResults } from './formatters/stylish-formatter.js';
import { fetchRemoteScorecardAndPlugins } from './remote/fetch-scorecard.js';
import { getTargetLevel } from './targets-handler/targets-handler.js';
import type { ScorecardClassicArgv } from './types.js';
import { validateScorecard } from './validation/validate-scorecard.js';

export async function handleScorecardClassic({
  argv,
  config,
  version,
  collectSpecData,
}: CommandArgs<ScorecardClassicArgv>) {
  const startedAt = performance.now();
  const apis = await getFallbackApisOrExit(argv.api ? [argv.api] : [], config);
  if (!apis.length) {
    exitWithError('No APIs were provided.');
  }

  const projectUrl =
    argv['project-url'] ||
    config.resolvedConfig.scorecardClassic?.fromProjectUrl ||
    config.resolvedConfig.scorecard?.fromProjectUrl;

  if (!projectUrl) {
    exitWithError(
      'Scorecard is not configured. Please provide it via --project-url flag or configure it in redocly.yaml. Learn more: https://redocly.com/docs/realm/config/scorecard#fromprojecturl-example'
    );
  }

  const apiKey = process.env.REDOCLY_AUTHORIZATION;

  if (isNonInteractiveEnvironment() && !apiKey) {
    exitWithError(
      'Please provide an API key using the REDOCLY_AUTHORIZATION environment variable.\n'
    );
  }

  const auth = apiKey || (await handleLoginAndFetchToken(config, argv.verbose));

  if (!auth) {
    exitWithError('Failed to obtain access token or API key.');
  }

  const { scorecard, plugins } = await fetchRemoteScorecardAndPlugins({
    projectUrl,
    auth,
    isApiKey: !!apiKey,
    verbose: argv.verbose,
  });

  // Get the API path from the command (first one is the one we're validating)
  const { path, alias } = apis[0];

  // Use the existing utility to find matching API and alias from config
  const matchedEntry = getAliasOrPath(config, path);
  const matchedAlias = matchedEntry.alias || alias;

  // Get metadata from the matched API config
  const apiConfigMetadata = matchedAlias
    ? config.resolvedConfig.apis?.[matchedAlias]?.metadata
    : undefined;

  if (argv.verbose && matchedAlias && apiConfigMetadata) {
    logger.info(`\n✓ Matched API "${cyan(matchedAlias)}" from config\n`);
  }

  if (argv.verbose) {
    logger.info(`Processing API: ${cyan(matchedAlias || 'default')}\n`);
    logger.info(`Path: ${formatPath(path)}\n`);
    if (apiConfigMetadata) {
      logger.info(`Config Metadata: ${JSON.stringify(apiConfigMetadata, null, 2)}\n`);
    }
    logger.info(`Project URL: ${projectUrl}\n`);
  }

  const externalRefResolver = new BaseResolver(config.resolve);
  const document = (await externalRefResolver.resolveDocument(null, path, true)) as Document;

  collectSpecData?.(document.parsed);

  // Build combined metadata from document and config
  const documentInfo = (
    document.parsed as unknown as {
      info?: { title?: string; version?: string; 'x-metadata'?: Record<string, unknown> };
    }
  )?.info;
  const builtInMetadata = documentInfo?.['x-metadata'] || {};

  const metadata = {
    title: documentInfo?.title,
    version: documentInfo?.version,
    ...builtInMetadata,
    ...apiConfigMetadata,
  };

  if (argv.verbose) {
    logger.info(`Combined Metadata for target matching: ${JSON.stringify(metadata, null, 2)}\n`);
  }

  const targetLevel = argv['target-level'] || getTargetLevel(scorecard, metadata);

  logger.info(gray(`\nRunning scorecard for ${formatPath(path)}...\n`));
  const {
    problems: result,
    achievedLevel,
    targetLevelAchieved,
  } = await validateScorecard({
    document,
    externalRefResolver,
    scorecardConfig: scorecard!,
    configPath: config.configPath,
    pluginsCodeOrPlugins: plugins,
    targetLevel,
    metadata,
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
  logger.info(`📊 Scorecard results for ${blue(formatPath(path))} ${green(elapsed)}.\n`);

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

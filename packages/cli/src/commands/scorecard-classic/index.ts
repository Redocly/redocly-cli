import {
  AbortFlowError,
  BaseResolver,
  HandledError,
  logger,
  pluralize,
  type Document,
} from '@redocly/openapi-core';
import {
  evaluatePluginsFromCode,
  fetchRemoteScorecardAndPlugins,
  getTarget,
  isAllowedScorecardProjectUrl,
  validateScorecard,
  type FetchRemoteScorecardAndPluginsParams,
  type RemoteScorecardAndPlugins,
  type ScorecardValidationResult,
} from '@redocly/reunite-integration';
import { blue, bold, cyan, gray, green, white } from 'colorette';
import { dirname } from 'node:path';

import {
  formatPath,
  getAliasOrPath,
  getExecutionTime,
  getFallbackApisOrExit,
} from '../../utils/miscellaneous.js';
import type { CommandArgs } from '../../wrapper.js';
import { printScorecardResultsAsCheckstyle } from './formatters/checkstyle-formatter.js';
import { printScorecardResultsAsJson } from './formatters/json-formatter.js';
import { printScorecardResultsAsJunit } from './formatters/junit-formatter.js';
import { printScorecardResults } from './formatters/stylish-formatter.js';
import { handleLoginAndFetchToken } from './login-handler.js';
import type { ScorecardClassicArgv, ScorecardClassicOutputFormat } from './types.js';

type ExtendedDocument = Document & {
  parsed: Document['parsed'] & {
    info?: { title?: string; version?: string; 'x-metadata'?: Record<string, unknown> };
  };
};

export async function handleScorecardClassic({
  argv,
  config,
  version,
  collectSpecData,
}: CommandArgs<ScorecardClassicArgv>) {
  const startedAt = performance.now();
  const { verbose } = argv;

  const [{ path, alias }] = await getFallbackApisOrExit(argv.api ? [argv.api] : [], config);
  const matchedAlias = getAliasOrPath(config, path).alias || alias;

  const projectUrl =
    argv['project-url'] ||
    config.resolvedConfig.scorecardClassic?.fromProjectUrl ||
    config.resolvedConfig.scorecard?.fromProjectUrl;

  if (!projectUrl) {
    throw new HandledError(
      'Scorecard is not configured. Please provide it via --project-url flag or configure it in redocly.yaml. Learn more: https://redocly.com/docs/realm/config/scorecard#fromprojecturl-example'
    );
  }

  if (!isAllowedScorecardProjectUrl(projectUrl)) {
    throw new HandledError(
      `Project URL must be from the .redocly.com domain. Received: ${projectUrl}`
    );
  }

  const apiKey = process.env.REDOCLY_AUTHORIZATION;

  if (isNonInteractiveEnvironment() && !apiKey) {
    throw new HandledError(
      'Please provide an API key using the REDOCLY_AUTHORIZATION environment variable.\n'
    );
  }

  const auth = apiKey || (await handleLoginAndFetchToken(config, version, verbose));

  if (!auth) {
    throw new HandledError('Failed to obtain access token or API key.');
  }

  const { scorecard, plugins } = await fetchScorecard({
    projectUrl,
    auth,
    isApiKey: !!apiKey,
    verbose,
  });

  const apiConfigMetadata = matchedAlias
    ? config.resolvedConfig.apis?.[matchedAlias]?.metadata
    : undefined;

  if (verbose && matchedAlias && apiConfigMetadata) {
    logger.info(`\n✓ Matched API "${cyan(matchedAlias)}" from config\n`);
  }

  if (verbose) {
    logger.info(`Processing API: ${cyan(matchedAlias || 'default')}\n`);
    logger.info(`Path: ${formatPath(path)}\n`);
    if (apiConfigMetadata) {
      logger.info(`Config Metadata: ${JSON.stringify(apiConfigMetadata, null, 2)}\n`);
    }
    logger.info(`Project URL: ${projectUrl}\n`);
  }

  const externalRefResolver = new BaseResolver(config.resolve);
  const document = (await externalRefResolver.resolveDocument(null, path, true)) as Document;

  collectSpecData?.(document);

  const documentInfo = (document as ExtendedDocument).parsed?.info;
  const builtInMetadata = documentInfo?.['x-metadata'] || {};

  const metadata = {
    title: documentInfo?.title,
    version: documentInfo?.version,
    ...builtInMetadata,
    ...apiConfigMetadata,
  };

  if (verbose) {
    logger.info(`Combined Metadata for target matching: ${JSON.stringify(metadata, null, 2)}\n`);
  }

  const matchedTarget = getTarget(scorecard.targets, metadata);
  const targetLevel = argv['target-level'] || matchedTarget?.minimumLevel;

  if (verbose && scorecard.targets?.length) {
    logger.info(
      `Scorecard has ${scorecard.targets.length} ${pluralize('target', scorecard.targets.length)} defined. Resolving target configurations...\n`
    );
    logger.info(
      matchedTarget
        ? `Found matching target for metadata. Resolving configurations for target "${JSON.stringify(matchedTarget.where)}"...\n`
        : `No matching target found for metadata. Proceeding with level configurations only.\n`
    );
  }

  logger.info(gray(`\nRunning scorecard for ${formatPath(path)}...\n`));
  const result = await validateScorecard({
    apiPath: path,
    document,
    externalRefResolver,
    scorecardConfig: scorecard,
    configPath: config.configPath,
    plugins: await evaluatePlugins(plugins, config.configPath),
    targetLevel,
    metadata,
  });

  if (verbose) {
    for (const level of scorecard.levels || []) {
      const levelProblems = result.problems.filter(
        (problem) => problem.scorecardLevel === level.name
      );
      logger.info(
        `Found ${levelProblems.length} ${pluralize('problem', levelProblems.length)} for level "${level.name}".\n`
      );
    }
  }

  reportResults({ path, result, targetLevel, format: argv.format, version, startedAt });
}

// The scorecard still runs, without plugins, when the plugins code cannot be evaluated.
async function evaluatePlugins(pluginsCode: string | undefined, configPath: string | undefined) {
  if (!pluginsCode) {
    return [];
  }

  try {
    return await evaluatePluginsFromCode(pluginsCode, configPath ? dirname(configPath) : undefined);
  } catch (error) {
    logger.warn(`Something went wrong during plugins evaluation: ${error.message}\n`);
    return [];
  }
}

async function fetchScorecard({
  verbose,
  ...params
}: FetchRemoteScorecardAndPluginsParams & {
  verbose?: boolean;
}): Promise<RemoteScorecardAndPlugins> {
  if (verbose) {
    logger.info(`Starting fetch for remote scorecard configuration...\n`);
  }

  let remoteScorecard: RemoteScorecardAndPlugins;
  try {
    remoteScorecard = await fetchRemoteScorecardAndPlugins(params);
  } catch (error) {
    if (verbose) {
      logger.error(`❌ Failed to fetch remote scorecard configuration.\n`);
      logger.error(`Error details: ${error.message}\n`);
      if (error.stack) {
        logger.error(`Stack trace:\n${error.stack}\n`);
      }
    }
    throw error;
  }

  if (verbose) {
    const { scorecard, plugins, pluginsUrl } = remoteScorecard;
    logger.info(`Successfully fetched scorecard configuration.\n`);
    logger.info(`Scorecard levels found: ${scorecard.levels?.length || 0}\n`);
    if (plugins) {
      logger.info(`Successfully fetched plugins from ${pluginsUrl}\n`);
    } else if (pluginsUrl) {
      logger.info(`No plugins were loaded from ${pluginsUrl}\n`);
    } else {
      logger.info(`No custom plugins configured for this scorecard.\n`);
    }
  }

  return remoteScorecard;
}

function reportResults({
  path,
  result: { problems, achievedLevel, targetLevelAchieved },
  targetLevel,
  format,
  version,
  startedAt,
}: {
  path: string;
  result: ScorecardValidationResult;
  targetLevel?: string;
  format: ScorecardClassicOutputFormat;
  version: string;
  startedAt: number;
}) {
  if (problems.length === 0) {
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

  if (format === 'json') {
    printScorecardResultsAsJson(problems, achievedLevel, targetLevelAchieved, version);
  } else if (format === 'checkstyle') {
    printScorecardResultsAsCheckstyle(path, problems, achievedLevel, targetLevelAchieved);
  } else if (format === 'junit') {
    printScorecardResultsAsJunit(path, problems, achievedLevel, targetLevelAchieved);
  } else {
    printScorecardResults(problems, achievedLevel, targetLevelAchieved);
  }

  const elapsed = getExecutionTime(startedAt);
  logger.info(
    `📊 Scorecard results for ${blue(formatPath(path))} at ${blue(path || 'stdout')} ${green(
      elapsed
    )}.\n`
  );

  if (targetLevel && !targetLevelAchieved) {
    throw new AbortFlowError('Target scorecard level not achieved.');
  }

  if (achievedLevel === 'Non Conformant') {
    throw new AbortFlowError('Scorecard validation failed.');
  }
}

function isNonInteractiveEnvironment(): boolean {
  if (process.env.CI || !process.stdin.isTTY) {
    return true;
  }

  return false;
}

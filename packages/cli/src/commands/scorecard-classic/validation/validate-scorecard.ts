import type { ScorecardConfig } from '@redocly/config';
import {
  logger,
  lintDocument,
  pluralize,
  type Document,
  type Plugin,
  type BaseResolver,
  type Config,
} from '@redocly/openapi-core';

import { exitWithError } from '../../../utils/error.js';
import { getTarget, resolveConfigForTarget } from '../targets-handler/targets-handler.js';
import type { ScorecardProblem } from '../types.js';
import { evaluatePluginsFromCode } from './plugin-evaluator.js';

export type ScorecardValidationResult = {
  problems: ScorecardProblem[];
  achievedLevel: string;
  targetLevelAchieved: boolean;
};

export type ValidateScorecardParams = {
  apiPath: string;
  document: Document;
  externalRefResolver: BaseResolver;
  scorecardConfig: ScorecardConfig;
  configPath?: string;
  pluginsCodeOrPlugins?: string | Plugin[];
  targetLevel?: string;
  metadata?: Record<string, unknown>;
  verbose?: boolean;
};

export async function validateScorecard({
  apiPath,
  document,
  externalRefResolver,
  scorecardConfig,
  configPath,
  pluginsCodeOrPlugins,
  targetLevel,
  metadata = {},
  verbose = false,
}: ValidateScorecardParams): Promise<ScorecardValidationResult> {
  const problems: ScorecardProblem[] = [];
  const levelResults: Map<string, ScorecardProblem[]> = new Map();
  const targets = scorecardConfig.targets || [];

  if (targetLevel && !scorecardConfig.levels?.some((level) => level.name === targetLevel)) {
    exitWithError(
      `Target level "${targetLevel}" not found in the scorecard configuration levels.\n`
    );
  }

  const plugins =
    typeof pluginsCodeOrPlugins === 'string'
      ? await evaluatePluginsFromCode(pluginsCodeOrPlugins, verbose)
      : pluginsCodeOrPlugins;

  const pluginsList = Array.isArray(plugins) ? plugins : [];
  let levelConfigs: Record<string, Config> = {};

  let targetRules: Record<string, unknown> | undefined;

  if (targets.length > 0) {
    if (verbose) {
      logger.info(
        `Scorecard has ${targets.length} ${pluralize('target', targets.length)} defined. Resolving target configurations...\n`
      );
    }

    const matchedTarget = getTarget(targets, metadata);

    if (matchedTarget) {
      if (verbose) {
        logger.info(
          `Found matching target for metadata. Resolving configurations for target "${JSON.stringify(matchedTarget.where)}"...\n`
        );
      }

      targetRules = matchedTarget.rules as Record<string, unknown> | undefined;
    } else {
      if (verbose) {
        logger.info(
          `No matching target found for metadata. Proceeding with level configurations only.\n`
        );
      }
    }
  }

  levelConfigs = await resolveConfigForTarget(
    apiPath,
    targetRules,
    scorecardConfig.levels || [],
    pluginsList,
    configPath || ''
  );

  for (const level of scorecardConfig.levels || []) {
    if (verbose) {
      logger.info(`\nValidating level: "${level.name}"\n`);
    }

    if (verbose && plugins && plugins.length > 0) {
      logger.info(
        `Using ${plugins.length} ${pluralize('plugin', plugins.length)} for this level.\n`
      );
    }

    const config = levelConfigs[level.name];

    if (verbose) {
      logger.info(`Linting document against level rules...\n`);
    }

    const levelProblems = await lintDocument({
      document,
      externalRefResolver,
      config,
    });

    const filteredProblems = levelProblems
      .filter(({ ignored }) => !ignored)
      .map((problem) => ({
        ...problem,
        scorecardLevel: level.name,
      }));

    levelResults.set(level.name, filteredProblems);

    if (verbose) {
      logger.info(
        `Found ${filteredProblems.length} ${pluralize(
          'problem',
          filteredProblems.length
        )} for level "${level.name}".\n`
      );
    }

    problems.push(...filteredProblems);
  }

  const achievedLevel = determineAchievedLevel(
    levelResults,
    scorecardConfig.levels || [],
    targetLevel
  );

  const targetLevelAchieved = targetLevel ? achievedLevel === targetLevel : true;

  return {
    problems,
    achievedLevel,
    targetLevelAchieved,
  };
}

function determineAchievedLevel(
  levelResults: Map<string, ScorecardProblem[]>,
  levels: Array<{ name: string }>,
  targetLevel?: string
): string {
  let lastPassedLevel: string | null = null;

  for (const level of levels) {
    const levelProblems = levelResults.get(level.name) || [];
    const hasErrors = levelProblems.some((p) => p.severity === 'error');

    if (hasErrors) {
      return lastPassedLevel || 'Non Conformant';
    }

    lastPassedLevel = level.name;

    if (targetLevel && level.name === targetLevel) {
      return level.name;
    }
  }

  return lastPassedLevel || 'Non Conformant';
}

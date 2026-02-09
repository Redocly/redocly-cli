import { logger, createConfig, lintDocument, pluralize } from '@redocly/openapi-core';
import { exitWithError } from '../../../utils/error.js';
import { evaluatePluginsFromCode } from './plugin-evaluator.js';
import type { ScorecardProblem } from '../types.js';
import type { ScorecardConfig } from '@redocly/config';
import type { Document, RawUniversalConfig, Plugin, BaseResolver } from '@redocly/openapi-core';

export type ScorecardValidationResult = {
  problems: ScorecardProblem[];
  achievedLevel: string;
  targetLevelAchieved: boolean;
};

export type ValidateScorecardParams = {
  document: Document;
  externalRefResolver: BaseResolver;
  scorecardConfig: ScorecardConfig;
  configPath?: string;
  pluginsCodeOrPlugins?: string | Plugin[];
  targetLevel?: string;
  verbose?: boolean;
};

export async function validateScorecard({
  document,
  externalRefResolver,
  scorecardConfig,
  configPath,
  pluginsCodeOrPlugins,
  targetLevel,
  verbose = false,
}: ValidateScorecardParams): Promise<ScorecardValidationResult> {
  const problems: ScorecardProblem[] = [];
  const levelResults: Map<string, ScorecardProblem[]> = new Map();

  if (targetLevel && !scorecardConfig.levels?.some((level) => level.name === targetLevel)) {
    exitWithError(
      `Target level "${targetLevel}" not found in the scorecard configuration levels.\n`
    );
  }

  for (const level of scorecardConfig?.levels || []) {
    if (verbose) {
      logger.info(`\nValidating level: "${level.name}"\n`);
    }

    const plugins =
      typeof pluginsCodeOrPlugins === 'string'
        ? await evaluatePluginsFromCode(pluginsCodeOrPlugins, verbose)
        : pluginsCodeOrPlugins;

    if (verbose && plugins && plugins.length > 0) {
      logger.info(
        `Using ${plugins.length} ${pluralize('plugin', plugins.length)} for this level.\n`
      );
    }

    const config = await createConfig({ ...level, plugins } as RawUniversalConfig, {
      configPath,
    });

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

import type { ScorecardConfig } from '@redocly/config';
import {
  logger,
  createConfig,
  lintDocument,
  pluralize,
  type Document,
  type RawUniversalConfig,
  type Plugin,
  type BaseResolver,
} from '@redocly/openapi-core';

import { exitWithError } from '../../../utils/error.js';
import { resolveTargetsConfig } from '../targets-handler/targets-handler.js';
import type { ScorecardProblem } from '../types.js';
import { evaluatePluginsFromCode } from './plugin-evaluator.js';

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
  metadata?: Record<string, unknown>;
  verbose?: boolean;
};

export async function validateScorecard({
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

  if (targetLevel && !scorecardConfig.levels?.some((level) => level.name === targetLevel)) {
    exitWithError(
      `Target level "${targetLevel}" not found in the scorecard configuration levels.\n`
    );
  }

  // Evaluate plugins first if they're provided as code
  const plugins =
    typeof pluginsCodeOrPlugins === 'string'
      ? await evaluatePluginsFromCode(pluginsCodeOrPlugins, verbose)
      : pluginsCodeOrPlugins;

  const pluginsList = Array.isArray(plugins) ? plugins.map((p) => p.id) : [];

  // Resolve target configs with merged rules if targets exist
  // Use the metadata passed from the caller (combined from document and config)
  const targetsWithConfigs = await resolveTargetsConfig(
    metadata,
    scorecardConfig.targets,
    scorecardConfig.levels || [],
    pluginsList,
    configPath || ''
  );

  // console.log('Resolved target configs:', JSON.stringify(targetsWithConfigs, null, 2)); // Debug log for resolved target configs

  // Check if we have a matching target with configs
  const targetConfigs =
    targetsWithConfigs && targetsWithConfigs.length > 0 ? targetsWithConfigs[0].configs : undefined;

  // Iterate through each level
  for (const level of scorecardConfig.levels || []) {
    if (verbose) {
      logger.info(`\nValidating level: "${level.name}"\n`);
    }

    if (verbose && plugins && plugins.length > 0) {
      logger.info(
        `Using ${plugins.length} ${pluralize('plugin', plugins.length)} for this level.\n`
      );
    }

    // Use target config if available, otherwise create config from level
    const config =
      targetConfigs?.[level.name] ||
      (await createConfig(
        { ...level, plugins: Array.isArray(plugins) ? plugins : [] } as RawUniversalConfig,
        {
          configPath,
        }
      ));

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

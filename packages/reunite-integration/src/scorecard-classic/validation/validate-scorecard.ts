import type { ScorecardConfig } from '@redocly/config';
import {
  HandledError,
  lintDocument,
  pluralize,
  type Document,
  type Plugin,
  type BaseResolver,
} from '@redocly/openapi-core';

import { getTarget, resolveConfigForTarget } from '../targets-handler/targets-handler.js';
import type { ScorecardProblem } from '../types.js';

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
  plugins?: Plugin[];
  targetLevel?: string;
  metadata?: Record<string, unknown>;
  // Receives a line for each step of the validation, for step-by-step debugging.
  onDebug?: (message: string) => void;
};

export async function validateScorecard({
  apiPath,
  document,
  externalRefResolver,
  scorecardConfig,
  configPath,
  plugins = [],
  targetLevel,
  metadata = {},
  onDebug,
}: ValidateScorecardParams): Promise<ScorecardValidationResult> {
  const problems: ScorecardProblem[] = [];
  const levelResults: Map<string, ScorecardProblem[]> = new Map();
  const levels = scorecardConfig.levels || [];

  if (targetLevel && !levels.some((level) => level.name === targetLevel)) {
    throw new HandledError(
      `Target level "${targetLevel}" not found in the scorecard configuration levels.\n`
    );
  }

  const targetRules = getTarget(scorecardConfig.targets, metadata)?.rules as
    | Record<string, unknown>
    | undefined;

  const levelConfigs = await resolveConfigForTarget(
    apiPath,
    targetRules,
    levels,
    plugins,
    configPath || ''
  );

  for (const level of levels) {
    onDebug?.(`\nValidating level: "${level.name}"`);
    if (plugins.length > 0) {
      onDebug?.(`Using ${plugins.length} ${pluralize('plugin', plugins.length)} for this level.`);
    }
    onDebug?.('Linting document against level rules...');

    const levelProblems = await lintDocument({
      document,
      externalRefResolver,
      config: levelConfigs[level.name],
    });

    const filteredProblems = levelProblems
      .filter(({ ignored }) => !ignored)
      .map((problem) => ({
        ...problem,
        scorecardLevel: level.name,
      }));

    onDebug?.(
      `Found ${filteredProblems.length} ${pluralize('problem', filteredProblems.length)} for level "${level.name}".`
    );

    levelResults.set(level.name, filteredProblems);
    problems.push(...filteredProblems);
  }

  const achievedLevel = determineAchievedLevel(levelResults, levels, targetLevel);

  return {
    problems,
    achievedLevel,
    targetLevelAchieved: targetLevel ? achievedLevel === targetLevel : true,
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

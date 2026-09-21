import type { ScorecardConfig } from '@redocly/config';
import {
  HandledError,
  lintDocument,
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

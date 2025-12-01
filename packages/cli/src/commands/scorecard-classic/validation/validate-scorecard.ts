import { createConfig, lintDocument } from '@redocly/openapi-core';
import { evaluatePluginsFromCode } from './plugin-evaluator.js';

import type { ScorecardConfig } from '@redocly/config';
import type { Document, RawUniversalConfig, Plugin, BaseResolver } from '@redocly/openapi-core';
import type { ScorecardProblem } from '../types.js';

export async function validateScorecard(
  document: Document,
  externalRefResolver: BaseResolver,
  scorecardConfig: ScorecardConfig,
  configPath?: string,
  pluginsCodeOrPlugins?: string | Plugin[]
): Promise<ScorecardProblem[]> {
  const problems: ScorecardProblem[] = [];

  for (const level of scorecardConfig?.levels || []) {
    const plugins =
      typeof pluginsCodeOrPlugins === 'string'
        ? await evaluatePluginsFromCode(pluginsCodeOrPlugins)
        : pluginsCodeOrPlugins;

    const config = await createConfig({ ...level, plugins } as RawUniversalConfig, {
      configPath,
    });

    const levelProblems = await lintDocument({
      document,
      externalRefResolver,
      config,
    });

    problems.push(
      ...levelProblems
        .filter(({ ignored }) => !ignored)
        .map((problem) => ({
          ...problem,
          scorecardLevel: level.name,
        }))
    );
  }

  return problems;
}

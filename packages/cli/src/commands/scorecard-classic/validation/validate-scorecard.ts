import { logger, createConfig, lintDocument, pluralize } from '@redocly/openapi-core';
import { evaluatePluginsFromCode } from './plugin-evaluator.js';

import type { ScorecardConfig } from '@redocly/config';
import type { Document, RawUniversalConfig, Plugin, BaseResolver } from '@redocly/openapi-core';
import type { ScorecardProblem } from '../types.js';

export async function validateScorecard(
  document: Document,
  externalRefResolver: BaseResolver,
  scorecardConfig: ScorecardConfig,
  configPath?: string,
  pluginsCodeOrPlugins?: string | Plugin[],
  verbose = false
): Promise<ScorecardProblem[]> {
  const problems: ScorecardProblem[] = [];

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

    if (verbose) {
      logger.info(
        `Found ${levelProblems.length} ${pluralize('problem', levelProblems.length)} for level "${
          level.name
        }".\n`
      );
    }

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

import { formatProblems, isAbsoluteUrl, makeDocumentFromString } from '@redocly/openapi-core';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { lintEntityByScorecardLevel } from 'core/src/lint.js';

import type { VerifyConfigOptions } from '../types.js';
import type { CommandArgs } from '../wrapper.js';

export type LintEntityArgv = {
  entityFilePath: string;
  api: string;
} & VerifyConfigOptions;

//TODO: function to testing purposes
export async function handleLintEntity({ argv, config }: CommandArgs<LintEntityArgv>) {
  const { entityFilePath, api } = argv;
  const absoluteEntityPath = isAbsoluteUrl(entityFilePath)
    ? entityFilePath
    : resolve(process.cwd(), entityFilePath);
  const apiRef = isAbsoluteUrl(api) ? api : resolve(process.cwd(), api);
  const documentApi = makeDocumentFromString(readFileSync(apiRef, 'utf-8'), apiRef);

  const entityFileContent = readFileSync(absoluteEntityPath, 'utf-8');

  const scorecardLevel = config.resolvedConfig?.scorecards?.[0]?.levels[0] || {
    name: 'default',
  };

  try {
    const problems = await lintEntityByScorecardLevel(
      JSON.parse(entityFileContent),
      scorecardLevel,
      documentApi
    );

    if (!problems) {
      console.log('No problems found.');
      return;
    }

    formatProblems(problems, {
      format: 'codeframe',
      totals: {
        errors: problems.filter((p) => p.severity === 'error').length,
        warnings: problems.filter((p) => p.severity === 'warn').length,
        ignored: 0,
      },
      version: '1.0.0',
    });
  } catch (error) {
    console.error('Error during linting entity:', error);
    return;
  }
}

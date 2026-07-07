import { bundle, logger } from '@redocly/openapi-core';
import { writeFileSync } from 'node:fs';

import type { VerifyConfigOptions } from '../../types.js';
import { AbortFlowError, exitWithError } from '../../utils/error.js';
import { getFallbackApisOrExit } from '../../utils/miscellaneous.js';
import type { CommandArgs } from '../../wrapper.js';
import { DiffError, diffDocuments } from './engine/index.js';
import type { DiffResult } from './engine/types.js';
import { htmlDiff } from './serializers/html.js';
import { jsonDiff } from './serializers/json.js';
import { markdownDiff } from './serializers/markdown.js';
import { stylishDiff } from './serializers/stylish.js';

export type DiffOutputFormat = 'stylish' | 'json' | 'markdown' | 'html';
export type DiffFailOn = 'breaking' | 'warning' | 'none';

export type DiffArgv = {
  base: string;
  revision: string;
  format: DiffOutputFormat;
  output?: string;
  'fail-on': DiffFailOn;
} & VerifyConfigOptions;

const SERIALIZERS: Record<DiffOutputFormat, (result: DiffResult) => string> = {
  stylish: stylishDiff,
  json: jsonDiff,
  markdown: markdownDiff,
  html: htmlDiff,
};

export async function handleDiff({ argv, config, collectSpecData }: CommandArgs<DiffArgv>) {
  const [{ path: basePath }] = await getFallbackApisOrExit([argv.base], config);
  const [{ path: revisionPath }] = await getFallbackApisOrExit([argv.revision], config);

  const { bundle: baseDocument } = await bundle({ config, ref: basePath });
  const { bundle: revisionDocument } = await bundle({ config, ref: revisionPath });
  collectSpecData?.(revisionDocument.parsed);

  let result: DiffResult;
  try {
    result = diffDocuments({ base: baseDocument, revision: revisionDocument, config });
  } catch (error) {
    if (error instanceof DiffError) {
      return exitWithError(error.message);
    }
    throw error;
  }

  const output = SERIALIZERS[argv.format](result);
  if (argv.output) {
    writeFileSync(argv.output, output);
  } else {
    logger.output(output + '\n');
  }

  const failOn = argv['fail-on'];
  const failed =
    failOn === 'breaking'
      ? result.summary.breaking > 0
      : failOn === 'warning'
        ? result.summary.breaking + result.summary.warning > 0
        : false;
  if (failed) {
    throw new AbortFlowError(
      `Diff failed: ${result.summary.breaking} breaking, ${result.summary.warning} warning change(s) found.`
    );
  }
}

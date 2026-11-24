import { logger, detectSpec, HandledError, parseYaml, Source } from '@redocly/openapi-core';
import { blue, green } from 'colorette';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { performance } from 'perf_hooks';

import { printExecutionTime, getAndValidateFileExtension } from '../../utils/miscellaneous.js';
import type { CommandArgs } from '../../wrapper.js';
import { splitAsyncApiDefinition } from './asyncapi/split-asyncapi-definition.js';
import { splitOASDefinition } from './oas/split-oas-definition.js';
import {
  type AnyOas3Definition,
  type AnyAsyncApiDefinition,
  type AnyDefinition,
  type SplitArgv,
} from './types.js';

export async function handleSplit({ argv, collectSpecData }: CommandArgs<SplitArgv>) {
  const startedAt = performance.now();
  const { api, outDir, separator } = argv;
  const ext = getAndValidateFileExtension(api);

  if (!fs.existsSync(api)) throw new HandledError(`File ${blue(api)} does not exist.`);

  const source = new Source(path.resolve(api), fs.readFileSync(api, 'utf-8'));
  const definition = parseYaml(source.body, { filename: api }) as AnyDefinition;
  collectSpecData?.({ parsed: definition });

  const specVersion = detectSpec(definition);
  switch (specVersion) {
    case 'async2':
    case 'async3':
      splitAsyncApiDefinition({
        asyncapi: definition as AnyAsyncApiDefinition,
        asyncapiDir: outDir,
        pathSeparator: separator,
        ext,
        specVersion,
        source,
        fileNameConflictsSeverity: argv['file-name-conflicts-severity'],
      });
      break;
    case 'oas3_0':
    case 'oas3_1':
    case 'oas3_2':
      splitOASDefinition(
        definition as AnyOas3Definition,
        outDir,
        separator,
        ext,
        source,
        argv['file-name-conflicts-severity']
      );
      break;
    case 'oas2':
      throw new HandledError('OpenAPI 2 is not supported by this command.');
    default:
      throw new HandledError(
        'File does not conform to the OpenAPI or AsyncAPI Specification. Version is not specified.'
      );
  }

  logger.info(
    `🪓 Document: ${blue(api)} ${green('is successfully split')}
    and all related files are saved to the directory: ${blue(outDir)} \n`
  );
  printExecutionTime('split', startedAt, api);
}

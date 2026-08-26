import { BaseResolver, analyzeApi, logger } from '@redocly/openapi-core';
import { writeFileSync } from 'node:fs';
import * as path from 'node:path';

import { exitWithError } from '../../utils/error.js';
import { getFallbackApisOrExit } from '../../utils/miscellaneous.js';
import type { CommandArgs } from '../../wrapper.js';
import { loadApi } from '../tree/index.js';
import { buildApiMap } from './build.js';
import { renderApiMap } from './render.js';

export type GenerateMapArgv = {
  api?: string;
  output?: string;
  config?: string;
  'lint-config'?: 'warn' | 'error' | 'off';
};

export async function handleGenerateMap({
  argv,
  config,
  collectSpecData,
}: CommandArgs<GenerateMapArgv>) {
  const apis = await getFallbackApisOrExit(argv.api ? [argv.api] : [], config);
  const apiPath = apis[0].path;
  const externalRefResolver = new BaseResolver(config.resolve);
  const { rootDocument, specVersion, types } = await loadApi({
    apiPath,
    config,
    collectSpecData,
    externalRefResolver,
  });

  if (!specVersion.startsWith('oas')) {
    return exitWithError(
      `generate-map supports OpenAPI descriptions; ${specVersion} is not supported yet.`
    );
  }

  const isRemote = /^https?:\/\//.test(apiPath);
  if (isRemote && argv.output === undefined) {
    return exitWithError('Pass --output when the description is remote.');
  }

  const cwd = process.cwd();
  const analysis = await analyzeApi({
    rootDocument,
    specVersion,
    types,
    externalRefResolver,
    cwd,
    resolveRef: (base, uri) => externalRefResolver.resolveExternalRef(base, uri),
  });

  const entryFileLabel = isRemote ? apiPath : path.relative(cwd, apiPath) || apiPath;
  const map = buildApiMap(analysis, { specVersion, cwd, entryFileLabel });
  const text = renderApiMap(map);

  const outputPath =
    argv.output ??
    path.join(path.dirname(apiPath), `${path.basename(apiPath).replace(/\.[^.]+$/, '')}.map.txt`);
  writeFileSync(outputPath, text);
  logger.info(
    `Map written to ${path.relative(cwd, outputPath) || outputPath}. ${map.operationCount} operations, ${Math.round(text.length / 1024)} KB.\n`
  );
}

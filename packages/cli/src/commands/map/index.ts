import {
  BaseResolver,
  buildApiMap,
  detectSpec,
  getMajorSpecVersion,
  type Document,
  type OutputFormat,
} from '@redocly/openapi-core';

import type { VerifyConfigOptions } from '../../types.js';
import { exitWithError } from '../../utils/error.js';
import { getFallbackApisOrExit } from '../../utils/miscellaneous.js';
import type { CommandArgs } from '../../wrapper.js';
import { printApiMap } from './print-map/index.js';

const SUPPORTED_MAJOR_VERSIONS = ['oas2', 'oas3', 'async2', 'async3'];

export type MapArgv = {
  api?: string;
  format: OutputFormat;
  'source-locations'?: boolean;
} & VerifyConfigOptions;

export async function handleMap({ argv, config, collectSpecData }: CommandArgs<MapArgv>) {
  const [{ path }] = await getFallbackApisOrExit(argv.api ? [argv.api] : [], config);
  const externalRefResolver = new BaseResolver(config.resolve);
  // resolveDocument returns a Document for a readable, parseable file; mirrors lint()
  const document = (await externalRefResolver.resolveDocument(null, path, true)) as Document;
  collectSpecData?.(document.parsed);

  let major;
  try {
    major = getMajorSpecVersion(detectSpec(document.parsed));
  } catch {
    major = undefined;
  }
  if (!major || !SUPPORTED_MAJOR_VERSIONS.includes(major)) {
    exitWithError(
      'The `map` command supports OpenAPI and AsyncAPI descriptions only. Please provide an OpenAPI 2.0-3.2 or AsyncAPI 2.x-3.0 document.'
    );
  }

  const apiMap = await buildApiMap({
    document,
    config,
    externalRefResolver,
    sourceLocations: argv['source-locations'],
  });

  printApiMap(apiMap, path, argv.format);
}

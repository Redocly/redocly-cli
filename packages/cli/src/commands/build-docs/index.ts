import {
  BaseResolver,
  bundle,
  type CollectSpecData,
  type Config,
  detectSpec,
  getMajorSpecVersion,
  HandledError,
  isAbsoluteUrl,
  isGraphqlRef,
  logger,
  type SpecMajorVersion,
} from '@redocly/openapi-core';
import { cyan } from 'colorette';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { convertSwagger2OpenAPI } from 'redoc';

import { renderBanner } from '../../utils/banner.js';
import {
  createParentDirectory,
  getExecutionTime,
  getFallbackApisOrExit,
  handleError,
} from '../../utils/miscellaneous.js';
import { redocVersion } from '../../utils/package.js';
import { isTelemetryEnabled } from '../../utils/telemetry.js';
import type { CommandArgs } from '../../wrapper.js';
import type { BuildDocsArgv, SpecType } from './types.js';
import { getRedocOptions, getPageHTML } from './utils.js';

export const handlerBuildCommand = async ({
  argv,
  config,
  collectSpecData,
}: CommandArgs<BuildDocsArgv>) => {
  // Remove this banner in the first release after January 31, 2027.
  logger.info(
    renderBanner([
      'build-docs renders docs with Redoc 3.',
      'Theme options and custom templates may need updates.',
      `To keep the Redoc 2 output: ${cyan('npx @redocly/cli@v1-archive build-docs <api>')}`,
      `Learn more: ${cyan('https://redocly.com/redoc-ce')}`,
    ])
  );

  const startedAt = performance.now();

  // FIXME: replace this line with `const { api } = argv;` when `getDeprecatedFirstApi` goes.
  // The first API stays out of `argv`, so the usage data shows that the run had no API argument.
  const api = argv.api ?? getDeprecatedFirstApi(config);
  if (api === undefined) {
    throw new HandledError(
      'No API to process. Pass an API to the command: `redocly build-docs <api>`.'
    );
  }
  const [{ path: pathToApi, alias }] = await getFallbackApisOrExit([api], config);

  const apiRef = isAbsoluteUrl(pathToApi) ? pathToApi : resolve(pathToApi);
  const aliasConfig = config.forAlias(alias);
  const { definition, specType } = await loadDefinition(apiRef, aliasConfig, collectSpecData).catch(
    (error) => handleError(error, apiRef)
  );
  for (const optionsKey of ['openapi', 'asyncapi', 'graphql'] as const) {
    if (optionsKey !== specType && argv[optionsKey] !== undefined) {
      logger.warn(
        `Ignoring --${optionsKey} because this API description uses --${specType} options.\n`
      );
    }
  }
  const redocOptions = getRedocOptions(argv[specType], aliasConfig, specType);

  const options = {
    output: argv.o,
    title: argv.title,
    templateFileName: argv.template,
    templateOptions: argv.templateOptions || {},
    redocOptions,
    redocVersion,
    disableTelemetry: !isTelemetryEnabled(config),
    inlineBundle: argv.inlineBundle,
  };

  const pageHTML = await getPageHTML(definition, options, argv.config);

  createParentDirectory(options.output);
  writeFileSync(options.output, pageHTML);
  const sizeInKiB = Math.ceil(Buffer.byteLength(pageHTML) / 1024);
  const elapsed = getExecutionTime(startedAt);
  logger.info(
    `\n🎉 bundled successfully in: ${options.output} (${sizeInKiB} KiB) [⏱ ${elapsed}].\n`
  );
};

// FIXME: remove this function when the deprecation period ends, a week to a month after the release.
// Before, `build-docs` without an API took the first API of the configuration file.
// Such a run now fails, because the command processes one API, which the command line names.
// Until then, it gets the first API as its `api` argument and a deprecation banner.
// `build-docs`, `stats`, `score`, and `scorecard-classic` each hold a copy of this function.
function getDeprecatedFirstApi(config: Config): string | undefined {
  const [firstApi] = Object.keys(config.resolvedConfig.apis ?? {});
  if (firstApi !== undefined) {
    logger.info(
      renderBanner([
        'Deprecated: build-docs without an API takes the first API of the configuration file.',
        'A later release requires the API.',
        `Pass the API: ${cyan('redocly build-docs <api>')}`,
      ])
    );
  }
  return firstApi;
}

const unsupportedSpecNames: Partial<Record<SpecMajorVersion, string>> = {
  arazzo1: 'Arazzo',
  arazzo1_1: 'Arazzo',
  overlay1: 'Overlay',
  openrpc1: 'OpenRPC',
};

async function loadDefinition(
  apiRef: string,
  config: Config,
  collectSpecData?: CollectSpecData
): Promise<{ definition: Record<string, unknown> | string; specType: SpecType }> {
  if (isGraphqlRef(apiRef)) {
    const resolver = new BaseResolver(config.resolve);
    const source = await resolver.loadExternalRef(apiRef);
    const definition = resolver.parseDocument(source, true).parsed as string;
    collectSpecData?.({ source });
    return { definition, specType: 'graphql' };
  }

  const { bundle: bundleResult } = await bundle({ ref: apiRef, config, collectSpecData });
  const parsed = bundleResult.parsed as Record<string, unknown>;
  const specVersion = getMajorSpecVersion(detectSpec(parsed));

  switch (specVersion) {
    case 'oas2':
      return { definition: await convertSwagger2OpenAPI(parsed), specType: 'openapi' };
    case 'oas3':
      return { definition: parsed, specType: 'openapi' };
    case 'async2':
    case 'async3':
      return { definition: parsed, specType: 'asyncapi' };
    default:
      throw new HandledError(
        `build-docs renders OpenAPI, AsyncAPI, and GraphQL. This file is ${unsupportedSpecNames[specVersion] ?? specVersion}.`
      );
  }
}

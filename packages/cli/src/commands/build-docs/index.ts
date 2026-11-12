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
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { convertSwagger2OpenAPI } from 'redoc';

import { renderBanner } from '../../utils/banner.js';
import { formatPath, getExecutionTime, getFallbackApisOrExit } from '../../utils/miscellaneous.js';
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
      'build-docs now renders docs with Redoc 3.',
      'Theme options and custom templates may need updates.',
      `To keep the Redoc 2 output: ${cyan('npx @redocly/cli@v1-archive build-docs <api>')}`,
      `Learn more: ${cyan('https://redocly.com/redoc-ce')}`,
    ])
  );

  // FIXME: remove this line with `getDeprecatedFirstApi`.
  argv.api ??= getDeprecatedFirstApi(argv, config);

  if (argv.o && !argv.api) {
    throw new HandledError('At least one inline API must be specified when using --output.');
  }
  const apis = await getFallbackApisOrExit(argv.api ? [argv.api] : [], config);
  const outputs = apis.map(
    ({ docsOutput }) => argv.o ?? (docsOutput ? formatPath(docsOutput) : 'redoc-static.html')
  );
  const repeatedOutput = outputs.find((output, index) => outputs.indexOf(output) !== index);
  if (repeatedOutput) {
    throw new HandledError(
      `Two APIs write to the same path: ${repeatedOutput}. Give each API a distinct \`docsOutput\`.`
    );
  }

  for (const [index, { path: pathToApi, alias }] of apis.entries()) {
    const startedAt = performance.now();
    const output = outputs[index];

    try {
      const apiRef = isAbsoluteUrl(pathToApi) ? pathToApi : resolve(pathToApi);
      const aliasConfig = config.forAlias(alias);
      const { definition, specType } = await loadDefinition(apiRef, aliasConfig, collectSpecData);
      for (const optionsKey of ['openapi', 'asyncapi', 'graphql'] as const) {
        if (optionsKey !== specType && argv[optionsKey] !== undefined) {
          logger.warn(
            `Ignoring --${optionsKey} because this API description uses --${specType} options.\n`
          );
        }
      }
      const redocOptions = getRedocOptions(argv[specType], aliasConfig, specType);

      const options = {
        output,
        title: argv.title,
        templateFileName: argv.template,
        templateOptions: argv.templateOptions || {},
        redocOptions,
        redocVersion,
        disableTelemetry: !isTelemetryEnabled(config),
        inlineBundle: argv.inlineBundle,
      };

      const pageHTML = await getPageHTML(definition, options, argv.config);

      mkdirSync(dirname(output), { recursive: true });
      writeFileSync(output, pageHTML);
      const sizeInKiB = Math.ceil(Buffer.byteLength(pageHTML) / 1024);
      const elapsed = getExecutionTime(startedAt);
      logger.info(`\n🎉 bundled successfully in: ${output} (${sizeInKiB} KiB) [⏱ ${elapsed}].\n`);
    } catch (error) {
      throw new HandledError(error instanceof Error ? error.message : String(error));
    }
  }
};

// FIXME: remove this function when the deprecation period ends, a week to a month after the release.
// Before the `docsOutput` option, `build-docs` without an API built the first API of the configuration file.
// Such a run now builds every API, so it fails with `--output`, or when two APIs write to `redoc-static.html`.
// Until then, a run that would fail this way gets the first API as its `api` argument and a deprecation banner.
function getDeprecatedFirstApi(argv: BuildDocsArgv, config: Config): string | undefined {
  const apis = Object.values(config.resolvedConfig.apis ?? {});
  const [firstApi] = Object.keys(config.resolvedConfig.apis ?? {});
  if (
    firstApi === undefined ||
    apis.some(({ docsOutput }) => docsOutput) ||
    (argv.o === undefined && apis.length === 1)
  ) {
    return undefined;
  }
  logger.info(
    renderBanner([
      'Deprecated: build-docs without an API builds the first API of the configuration file.',
      'A later release builds every API of the configuration file.',
      `Pass the API: ${cyan('redocly build-docs <api>')}, or set docsOutput for each API.`,
      `Learn more: ${cyan('https://redocly.com/docs/cli/commands/build-docs#build-docs-for-several-apis')}`,
    ])
  );
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

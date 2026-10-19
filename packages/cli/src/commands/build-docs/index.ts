import {
  BaseResolver,
  bundle,
  detectSpec,
  getMajorSpecVersion,
  HandledError,
  isAbsoluteUrl,
  isGraphqlRef,
  logger,
} from '@redocly/openapi-core';
import { cyan } from 'colorette';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { convertSwagger2OpenAPI } from 'redoc';

import { renderBanner } from '../../utils/banner.js';
import { getExecutionTime, getFallbackApisOrExit } from '../../utils/miscellaneous.js';
import { redocVersion } from '../../utils/package.js';
import type { CommandArgs } from '../../wrapper.js';
import type { BuildDocsArgv, SpecType } from './types.js';
import { getObjectOrJSON, getPageHTML } from './utils.js';

export const handlerBuildCommand = async ({
  argv,
  config,
  collectSpecData,
}: CommandArgs<BuildDocsArgv>) => {
  // Remove this banner in the first release after January 31, 2027.
  logger.info(
    renderBanner([
      'build-docs now renders docs with Redoc 3.',
      `Theme options and custom templates may need updates: ${cyan('https://redocly.com/blog/redoc-3-whats-new')}`,
      `To keep the Redoc 2 output: ${cyan('npx @redocly/cli@v1-archive build-docs <api>')}`,
    ])
  );

  const startedAt = performance.now();

  const apis = await getFallbackApisOrExit(argv.api ? [argv.api] : [], config);
  const { path: pathToApi, alias } = apis[0];

  try {
    const apiRef = isAbsoluteUrl(pathToApi) ? pathToApi : resolve(pathToApi);
    let definition: Record<string, unknown> | string;
    let specType: SpecType;

    if (isGraphqlRef(apiRef)) {
      const resolver = new BaseResolver(config.resolve);
      const source = await resolver.loadExternalRef(apiRef);
      definition = resolver.parseDocument(source, true).parsed as string;
      specType = 'graphql';
      collectSpecData?.({ source });
    } else {
      const { bundle: bundleResult } = await bundle({
        ref: apiRef,
        config: config.forAlias(alias),
        collectSpecData,
      });
      ({ definition, specType } = await detectDefinition(
        bundleResult.parsed as Record<string, unknown>
      ));
    }

    const redocOptions = getObjectOrJSON(argv[specType], config.forAlias(alias), specType);

    const options = {
      output: argv.o,
      title: argv.title,
      templateFileName: argv.template,
      templateOptions: argv.templateOptions || {},
      redocOptions,
      redocVersion,
      disableTelemetry:
        process.env.REDOCLY_TELEMETRY === 'off' || config.resolvedConfig.telemetry === 'off',
      inlineBundle: argv.inlineBundle,
    };

    const pageHTML = await getPageHTML(definition, options, argv.config);

    mkdirSync(dirname(options.output), { recursive: true });
    writeFileSync(options.output, pageHTML);
    const sizeInKiB = Math.ceil(Buffer.byteLength(pageHTML) / 1024);
    const elapsed = getExecutionTime(startedAt);
    logger.info(
      `\n🎉 bundled successfully in: ${options.output} (${sizeInKiB} KiB) [⏱ ${elapsed}].\n`
    );
  } catch (error) {
    throw new HandledError(error instanceof Error ? error.message : String(error));
  }
};

async function detectDefinition(
  parsed: Record<string, unknown>
): Promise<{ definition: Record<string, unknown>; specType: SpecType }> {
  switch (getMajorSpecVersion(detectSpec(parsed))) {
    case 'oas2':
      return { definition: await convertSwagger2OpenAPI(parsed), specType: 'openapi' };
    case 'oas3':
      return { definition: parsed, specType: 'openapi' };
    case 'async2':
    case 'async3':
      return { definition: parsed, specType: 'asyncapi' };
    default:
      throw new HandledError(
        'Only OpenAPI and AsyncAPI descriptions and GraphQL schemas are supported by this command.'
      );
  }
}

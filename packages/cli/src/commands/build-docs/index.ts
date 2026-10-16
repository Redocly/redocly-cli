import {
  BaseResolver,
  bundle,
  detectSpec,
  HandledError,
  isAbsoluteUrl,
  isGraphqlRef,
  logger,
} from '@redocly/openapi-core';
import { bold, cyan, yellow } from 'colorette';
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
  logger.info(
    renderBanner([
      bold(yellow('build-docs now renders docs with Redoc 3')),
      '',
      'Redoc 3 is faster on large APIs, has built-in dark mode and CSS-based theming,',
      'and supports OpenAPI 3.2, AsyncAPI, GraphQL, and MCP.',
      '',
      'Redoc 2 theme options and custom templates may need updates.',
      '',
      'To keep the Redoc 2 output, pin @redocly/cli to the version you used before,',
      `or use Redocly CLI v1: ${cyan('npx @redocly/cli@v1-archive build-docs <api>')}`,
      '',
      `Learn more: ${cyan('https://redocly.com/blog/redoc-3-whats-new')}`,
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
      const parsed = bundleResult.parsed as Record<string, unknown>;
      const spec = detectSpec(parsed);
      definition = spec === 'oas2' ? await convertSwagger2OpenAPI(parsed) : parsed;
      specType = spec.startsWith('async') ? 'asyncapi' : 'openapi';
    }

    const redocOptions = getObjectOrJSON(argv[specType], config.forAlias(alias), specType);

    const options = {
      output: argv.o,
      title: argv.title,
      disableGoogleFont: argv.disableGoogleFont,
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
  } catch (e) {
    throw new HandledError(e instanceof Error ? e.message : String(e));
  }
};

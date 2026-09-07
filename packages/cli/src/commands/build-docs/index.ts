import {
  bundle,
  detectSpec,
  isAbsoluteUrl,
  isGraphqlRef,
  logger,
  Source,
} from '@redocly/openapi-core';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { convertSwagger2OpenAPI } from 'redoc/bundle/redoc.server.js';

import { exitWithError } from '../../utils/error.js';
import { getExecutionTime, getFallbackApisOrExit } from '../../utils/miscellaneous.js';
import { redocVersion } from '../../utils/package.js';
import type { CommandArgs } from '../../wrapper.js';
import type { BuildDocsArgv, BuildDocsOptions } from './types.js';
import { getObjectOrJSON, getPageHTML } from './utils.js';

export const handlerBuildCommand = async ({
  argv,
  config,
  collectSpecData,
}: CommandArgs<BuildDocsArgv>) => {
  const startedAt = performance.now();

  const apis = await getFallbackApisOrExit(argv.api ? [argv.api] : [], config);
  const { path: pathToApi, alias } = apis[0];

  if (argv.theme) {
    logger.warn('Option --theme.openapi is deprecated. Use --openapi instead.\n');
  }

  const options = {
    output: argv.o,
    title: argv.title,
    disableGoogleFont: argv.disableGoogleFont,
    templateFileName: argv.template,
    templateOptions: argv.templateOptions || {},
    redocOptions: getObjectOrJSON(argv.openapi ?? argv.theme?.openapi, config.forAlias(alias)),
    telemetry: argv.telemetry,
    inlineBundle: argv.inlineBundle,
  };

  try {
    const apiRef = isAbsoluteUrl(pathToApi) ? pathToApi : resolve(pathToApi);
    let definition: Record<string, unknown> | string;
    let specType: BuildDocsOptions['specType'];

    if (isGraphqlRef(apiRef)) {
      definition = readFileSync(apiRef, 'utf-8');
      specType = 'graphql';
      collectSpecData?.({ source: new Source(apiRef, definition) });
    } else {
      const { bundle: bundleResult } = await bundle({
        ref: apiRef,
        config: config.forAlias(alias),
        collectSpecData,
      });
      const parsed = bundleResult.parsed as Record<string, unknown>;
      definition = detectSpec(parsed) === 'oas2' ? await convertSwagger2OpenAPI(parsed) : parsed;
    }

    const pageHTML = await getPageHTML(
      definition,
      { ...options, redocVersion, specType },
      argv.config
    );

    mkdirSync(dirname(options.output), { recursive: true });
    writeFileSync(options.output, pageHTML);
    const sizeInKiB = Math.ceil(Buffer.byteLength(pageHTML) / 1024);
    const elapsed = getExecutionTime(startedAt);
    logger.info(
      `\n🎉 bundled successfully in: ${options.output} (${sizeInKiB} KiB) [⏱ ${elapsed}].\n`
    );
  } catch (e) {
    exitWithError(e);
  }
};

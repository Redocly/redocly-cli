import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { isAbsoluteUrl, loadConfig, logger, bundle, detectSpec } from '@redocly/openapi-core';
import { getObjectOrJSON, getPageHTML } from './utils.js';
import { getExecutionTime, getFallbackApisOrExit } from '../../utils/miscellaneous.js';
import { exitWithError } from '../../utils/error.js';
import { convertSwagger2OpenAPI } from 'redoc';

import type { BuildDocsArgv } from './types.js';
import type { CommandArgs } from '../../wrapper.js';

const packageJson = createRequire(import.meta.url ?? __dirname)('../../../package.json');

export const handlerBuildCommand = async ({
  argv,
  config,
  collectSpecData,
}: CommandArgs<BuildDocsArgv>) => {
  const startedAt = performance.now();

  const apis = await getFallbackApisOrExit(argv.api ? [argv.api] : [], config);
  const { path: pathToApi, alias } = apis[0];
  const options = {
    output: argv.o,
    title: argv.title,
    disableGoogleFont: argv.disableGoogleFont,
    templateFileName: argv.template,
    templateOptions: argv.templateOptions || {},
    redocOptions: getObjectOrJSON(argv.openapi || argv.theme?.openapi, config.forAlias(alias)),
  };

  const redocVersion = packageJson.dependencies.redoc || 'latest';

  try {
    const elapsed = getExecutionTime(startedAt);
    const config = await loadConfig({ configPath: argv.config });
    const {
      bundle: { parsed },
    } = await bundle({
      config,
      ref: isAbsoluteUrl(pathToApi) ? pathToApi : resolve(pathToApi),
    });
    const specVersion = detectSpec(parsed);
    const openapiDescription =
      specVersion === 'oas2' ? convertSwagger2OpenAPI(parsed as Record<string, unknown>) : parsed;

    logger.info(`✅  OpenAPI definition loaded and bundled in [⏱ ${elapsed}].\n`);

    collectSpecData?.(openapiDescription);
    const pageHTML = await getPageHTML(
      openapiDescription,
      { ...options, redocVersion },
      argv.config,
      argv.inlineBundle
    );

    mkdirSync(dirname(options.output), { recursive: true });
    writeFileSync(options.output, pageHTML);
    const sizeInKiB = Math.ceil(Buffer.byteLength(pageHTML) / 1024);
    logger.info(
      `\n🎉 bundled successfully in: ${options.output} (${sizeInKiB} KiB) [⏱ ${elapsed}].\n`
    );
  } catch (e) {
    exitWithError(e);
  }
};

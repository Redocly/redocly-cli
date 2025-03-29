import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';
import { default as redoc } from 'redoc';
import { performance } from 'node:perf_hooks';
import { getMergedConfig, isAbsoluteUrl, logger } from '@redocly/openapi-core';
import { getObjectOrJSON, getPageHTML } from './utils.js';
import {
  exitWithError,
  getExecutionTime,
  getFallbackApisOrExit,
} from '../../utils/miscellaneous.js';

import type { BuildDocsArgv } from './types.js';
import type { CommandArgs } from '../../wrapper.js';

const packageJson = createRequire(import.meta.url)('../../../package.json');

export const handlerBuildCommand = async ({
  argv,
  config: configFromFile,
  collectSpecData,
}: CommandArgs<BuildDocsArgv>) => {
  const startedAt = performance.now();

  const config = getMergedConfig(configFromFile, argv.api);
  const apis = await getFallbackApisOrExit(argv.api ? [argv.api] : [], config);
  const { path: pathToApi } = apis[0];

  const options = {
    output: argv.o,
    title: argv.title,
    disableGoogleFont: argv.disableGoogleFont,
    templateFileName: argv.template,
    templateOptions: argv.templateOptions || {},
    redocOptions: getObjectOrJSON(argv.theme?.openapi, config),
  };

  const redocCurrentVersion = packageJson.dependencies.redoc;

  try {
    const elapsed = getExecutionTime(startedAt);

    const api = await redoc.loadAndBundleSpec(
      isAbsoluteUrl(pathToApi) ? pathToApi : resolve(pathToApi)
    );
    collectSpecData?.(api);
    const pageHTML = await getPageHTML(
      api,
      pathToApi,
      { ...options, redocCurrentVersion },
      argv.config
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

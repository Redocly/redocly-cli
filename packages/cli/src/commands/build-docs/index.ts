import { loadAndBundleSpec } from 'redoc';
import { dirname, resolve } from 'path';
import { writeFileSync, mkdirSync } from 'fs';
import { performance } from 'perf_hooks';

import { getObjectOrJSON, getPageHTML } from './utils';
import type { BuildDocsArgv } from './types';
import { getMergedConfig, loadConfig } from '@redocly/openapi-core';
import { exitWithError, getExecutionTime, isURL, getFallbackApisOrExit } from '../../utils';

export const handlerBuildCommand = async (argv: BuildDocsArgv) => {
  const startedAt = performance.now();

  const configFromFile = await loadConfig({ configPath: argv.config });
  const config = getMergedConfig(configFromFile, argv.api);

  const apis = await getFallbackApisOrExit(argv.api ? [argv.api] : [], config);
  const { path: pathToApi } = apis[0];

  const options = {
    output: argv.o,
    cdn: argv.cdn,
    title: argv.title,
    disableGoogleFont: argv.disableGoogleFont,
    templateFileName: argv.template,
    templateOptions: argv.templateOptions || {},
    redocOptions: getObjectOrJSON(argv.features?.openapi, config),
  };

  const redocCurrentVersion = require('../../../package.json').dependencies.redoc.substring(1); // remove ~

  try {
    const elapsed = getExecutionTime(startedAt);

    const api = await loadAndBundleSpec(
      isURL(pathToApi) ? pathToApi : resolve(argv.config ? dirname(argv.config) : '', pathToApi)
    );
    const pageHTML = await getPageHTML(api, pathToApi, { ...options, redocCurrentVersion });

    mkdirSync(dirname(options.output), { recursive: true });
    writeFileSync(options.output, pageHTML);
    const sizeInKiB = Math.ceil(Buffer.byteLength(pageHTML) / 1024);
    process.stderr.write(
      `\n🎉 bundled successfully in: ${options.output} (${sizeInKiB} KiB) [⏱ ${elapsed}].\n`
    );
  } catch (e) {
    exitWithError(e);
  }
};

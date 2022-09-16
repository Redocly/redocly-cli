import { loadAndBundleSpec } from 'redoc';
import { dirname, resolve } from 'path';
import { writeFileSync, mkdirSync } from 'fs';
import { performance } from 'perf_hooks';

import { getObjectOrJSON, isURL, getPageHTML } from './utils';
import type { BuildDocsArgv } from './types';
import { exitWithError, getExecutionTime } from '../../utils';

export const handlerBuildCommand = async (argv: BuildDocsArgv) => {
  const startedAt = performance.now();
  const config = {
    output: argv.o,
    cdn: argv.cdn,
    title: argv.title,
    disableGoogleFont: argv.disableGoogleFont,
    templateFileName: argv.template,
    templateOptions: argv.templateOptions || {},
    redocOptions: getObjectOrJSON(argv.options),
  };

  const redocCurrentVersion = require('../../../package.json').dependencies.redoc.substring(1); // remove ~
  const pathToApi = argv.api;

  try {
    const elapsed = getExecutionTime(startedAt);
    const api = await loadAndBundleSpec(isURL(pathToApi) ? pathToApi : resolve(pathToApi));
    const pageHTML = await getPageHTML(api, pathToApi, { ...config, redocCurrentVersion });

    mkdirSync(dirname(config.output), { recursive: true });
    writeFileSync(config.output, pageHTML);
    const sizeInKiB = Math.ceil(Buffer.byteLength(pageHTML) / 1024);
    process.stderr.write(
      `\n🎉 bundled successfully in: ${config.output} (${sizeInKiB} KiB) [⏱ ${elapsed}].\n`
    );
  } catch (e) {
    exitWithError(e);
  }
};

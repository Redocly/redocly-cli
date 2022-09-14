import { loadAndBundleSpec } from 'redoc';
import { dirname, resolve } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

import { getObjectOrJSON, handleError, isURL, getPageHTML } from './utils';
import type { BuildDocsArgv } from './types';

export const handlerBuildCommand = async (argv: BuildDocsArgv) => {
  const config = {
    output: argv.o,
    cdn: argv.cdn,
    title: argv.title,
    disableGoogleFont: argv.disableGoogleFont,
    templateFileName: argv.template,
    templateOptions: argv.templateOptions || {},
    redocOptions: getObjectOrJSON(argv.options),
  };

  const redocCurrentVersion = require('../../../package.json').dependencies.redoc;
  const pathToSpec = argv.spec;

  try {
    const start = Date.now();
    const spec = await loadAndBundleSpec(isURL(pathToSpec) ? pathToSpec : resolve(pathToSpec));
    const pageHTML = await getPageHTML(spec, pathToSpec, { ...config, redocCurrentVersion });

    mkdirSync(dirname(config.output), { recursive: true });
    writeFileSync(config.output, pageHTML);
    const sizeInKiB = Math.ceil(Buffer.byteLength(pageHTML) / 1024);
    const time = Date.now() - start;
    console.log(
      `\n🎉 bundled successfully in: ${config.output} (${sizeInKiB} KiB) [⏱ ${time / 1000}s]`
    );
  } catch (e) {
    handleError(e);
  }
};

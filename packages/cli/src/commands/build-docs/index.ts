import { createRequire } from 'node:module';
import { dirname, resolve, extname } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';
import { default as redoc } from 'redoc';
import { performance } from 'node:perf_hooks';
import { isAbsoluteUrl, logger } from '@redocly/openapi-core';
import { getObjectOrJSON, getPageHTML } from './utils.js';
import { getExecutionTime, getFallbackApisOrExit } from '../../utils/miscellaneous.js';
import { exitWithError } from '../../utils/error.js';
import { parseProtoFile, protoToOpenAPI } from '../../utils/proto-parser.js';

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
  const { path: pathToApi } = apis[0];

  const options = {
    output: argv.o,
    title: argv.title,
    disableGoogleFont: argv.disableGoogleFont,
    templateFileName: argv.template,
    templateOptions: argv.templateOptions || {},
    redocOptions: getObjectOrJSON(argv.theme?.openapi, config, argv.api),
  };

  const redocCurrentVersion = packageJson.dependencies.redoc;

  try {
    const elapsed = getExecutionTime(startedAt);

    let api: any;
    // Handle .proto files
    if (extname(pathToApi).toLowerCase() === '.proto') {
      logger.info('Parsing Protocol Buffers file...\n');
      const proto = parseProtoFile(pathToApi);
      api = protoToOpenAPI(proto);
      logger.info('Converted Protocol Buffers to OpenAPI format.\n');
    } else {
      // Handle regular OpenAPI files
      api = await redoc.loadAndBundleSpec(
        isAbsoluteUrl(pathToApi) ? pathToApi : resolve(pathToApi)
      );
    }
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

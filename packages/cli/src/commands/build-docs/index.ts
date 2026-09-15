import { isAbsoluteUrl, logger, HandledError } from '@redocly/openapi-core';
import { bold, cyan, yellow } from 'colorette';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { default as redoc } from 'redoc';

import { renderBanner } from '../../utils/banner.js';
import { exitWithError } from '../../utils/error.js';
import { getExecutionTime, getFallbackApisOrExit } from '../../utils/miscellaneous.js';
import { redocVersion } from '../../utils/package.js';
import type { CommandArgs } from '../../wrapper.js';
import type { BuildDocsArgv } from './types.js';
import { getObjectOrJSON, getPageHTML } from './utils.js';

export const handlerBuildCommand = async ({
  argv,
  config,
  collectSpecData,
}: CommandArgs<BuildDocsArgv>) => {
  logger.info(
    renderBanner([
      bold(yellow('Deprecation warning: build-docs is moving to Redoc 3')),
      '',
      'An upcoming Redocly CLI release will render docs with Redoc 3:',
      'faster on large APIs, built-in dark mode, CSS-based theming, and',
      'support for OpenAPI 3.2, AsyncAPI, GraphQL, and MCP.',
      'Redoc 2 theme options and custom templates may need updates.',
      '',
      'To keep the current Redoc 2 output, use Redocly CLI v1:',
      `  ${cyan('npx @redocly/cli@v1-archive build-docs <api>')}`,
      '',
      `Learn more: ${cyan('https://redocly.com/blog/redoc-3-whats-new')}`,
    ])
  );

  const startedAt = performance.now();

  const apis = await getFallbackApisOrExit(argv.api ? [argv.api] : [], config);
  const { path: pathToApi, alias } = apis[0];
  const options = {
    output: argv.o,
    title: argv.title,
    disableGoogleFont: argv.disableGoogleFont,
    templateFileName: argv.template,
    templateOptions: argv.templateOptions || {},
    redocOptions: getObjectOrJSON(argv.theme?.openapi, config.forAlias(alias)),
  };

  try {
    const elapsed = getExecutionTime(startedAt);

    const api = await redoc.loadAndBundleSpec(
      isAbsoluteUrl(pathToApi) ? pathToApi : resolve(pathToApi)
    );
    collectSpecData?.({ parsed: api });
    const pageHTML = await getPageHTML(api, pathToApi, { ...options, redocVersion }, argv.config);

    mkdirSync(dirname(options.output), { recursive: true });
    writeFileSync(options.output, pageHTML);
    const sizeInKiB = Math.ceil(Buffer.byteLength(pageHTML) / 1024);
    logger.info(
      `\n🎉 bundled successfully in: ${options.output} (${sizeInKiB} KiB) [⏱ ${elapsed}].\n`
    );
  } catch (e) {
    throw new HandledError(e);
  }
};

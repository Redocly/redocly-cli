import { logger, type Config } from '@redocly/openapi-core';
import { default as handlebars } from 'handlebars';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { prepareApiDocs, RedoclyApiDocsStandalone, ServerStyleSheet } from 'redoc';

import { exitWithError } from '../../utils/error.js';
import type { BuildDocsOptions } from './types.js';

const DEFAULT_TEMPLATE_SOURCE = `<!DOCTYPE html>
<html>

<head>
  <meta charset="utf8" />
  <title>{{title}}</title>
  <!-- needed for adaptive design -->
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      padding: 0;
      margin: 0;
    }
  </style>
  {{{redocHead}}}
</head>

<body>
  {{{redocHTML}}}
</body>

</html>
`;

export function getObjectOrJSON(
  openapiOptions: string | Record<string, unknown> | undefined,
  config: Config
): JSON | Record<string, unknown> | Config {
  switch (typeof openapiOptions) {
    case 'object':
      return openapiOptions;
    case 'string':
      try {
        if (existsSync(openapiOptions) && lstatSync(openapiOptions).isFile()) {
          return JSON.parse(readFileSync(openapiOptions, 'utf-8'));
        } else {
          return JSON.parse(openapiOptions);
        }
      } catch (e) {
        logger.error(
          `Encountered error:\n\n${openapiOptions}\n\nis neither a file with a valid JSON object neither a stringified JSON object.`
        );
        exitWithError(e);
      }
      break;
    default: {
      if (config?.configPath) {
        logger.info(`Found ${config.configPath} and using 'openapi' options\n`);
        return config.resolvedConfig?.openapi ?? {};
      }
      return {};
    }
  }
  return {};
}

export async function getPageHTML(
  definition: Record<string, unknown> | string,
  {
    title,
    disableGoogleFont,
    templateFileName,
    templateOptions,
    redocOptions = {},
    redocVersion,
    telemetry,
    inlineBundle,
    specType,
  }: BuildDocsOptions,
  configPath?: string
) {
  logger.info('Prerendering docs\n');

  const pageOptions = { ...redocOptions, skipBundle: true, specType };
  const prepared = await prepareApiDocs({ definition, specType, options: pageOptions });
  const app = createElement(RedoclyApiDocsStandalone, {
    items: prepared.items,
    store: prepared.store,
    basePath: '/',
    options: prepared.options,
    telemetryConfig: { typeOfUsage: 'cli', disabled: !telemetry },
    definition: prepared.document,
  });
  const sheet = new ServerStyleSheet();
  const html = renderToString(sheet.collectStyles(app));
  const css = sheet.getStyleTags();

  const customTemplate =
    templateFileName ||
    (redocOptions?.htmlTemplate
      ? path.resolve(configPath ? path.dirname(configPath) : '', redocOptions.htmlTemplate)
      : undefined);

  const templateSource = customTemplate
    ? readFileSync(customTemplate, 'utf-8')
    : DEFAULT_TEMPLATE_SOURCE;
  const template = handlebars.compile(templateSource);

  const redocScript = inlineBundle
    ? escapeClosingScriptTag(getRedocStandaloneSource())
    : `import { hydrate } from "https://cdn.redocly.com/redoc/v${redocVersion}/redoc.standalone.js";`;

  const definitionTitle =
    typeof definition === 'string'
      ? undefined
      : (definition.info as { title?: string } | undefined)?.title;

  return template({
    redocHTML: `
      <div id="redoc" style="--navbar-height:0px">${html}</div>
      <script type="module">
      ${redocScript}

      const __redoc_definition = ${sanitizeJSONString(JSON.stringify(definition))};
      const __redoc_options = ${sanitizeJSONString(
        JSON.stringify({ ...pageOptions, disableTelemetry: !telemetry })
      )};

      hydrate(__redoc_definition, __redoc_options, document.getElementById('redoc'));
      </script>`,
    redocHead: css,
    title: title || definitionTitle || 'ReDoc documentation',
    disableGoogleFont,
    templateOptions,
  });
}

function getRedocStandaloneSource(): string {
  const bundledCopy = fileURLToPath(new URL('./redoc.standalone.js', import.meta.url));
  if (existsSync(bundledCopy)) {
    return readFileSync(bundledCopy, 'utf-8');
  }
  const redocPackageJsonPath = createRequire(import.meta.url).resolve('redoc/package.json');
  return readFileSync(
    path.join(path.dirname(redocPackageJsonPath), 'bundle', 'redoc.standalone.js'),
    'utf-8'
  );
}

export function sanitizeJSONString(str: string): string {
  return escapeClosingScriptTag(escapeUnicode(str));
}

// see http://www.thespanner.co.uk/2011/07/25/the-json-specification-is-now-wrong/
export function escapeClosingScriptTag(str: string): string {
  return str.replace(/<\/script>/g, '<\\/script>');
}

// see http://www.thespanner.co.uk/2011/07/25/the-json-specification-is-now-wrong/
export function escapeUnicode(str: string): string {
  return str.replace(/\u2028|\u2029/g, (m) => '\\u202' + (m === '\u2028' ? '8' : '9'));
}

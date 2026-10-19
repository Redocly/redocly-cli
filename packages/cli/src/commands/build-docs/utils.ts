import { HandledError, logger, type Config } from '@redocly/openapi-core';
import { default as handlebars } from 'handlebars';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { logoFromSpec, prepareApiDocs, RedoclyApiDocsStandalone, ServerStyleSheet } from 'redoc';

import type { BuildDocsOptions, SpecType } from './types.js';

const DEFAULT_TEMPLATE_SOURCE = `<!DOCTYPE html>
<html lang="en">

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
  specOptions: string | Record<string, unknown> | undefined,
  config: Config,
  specType: SpecType
): Record<string, unknown> {
  switch (typeof specOptions) {
    case 'object':
      return specOptions;
    case 'string':
      try {
        if (existsSync(specOptions) && lstatSync(specOptions).isFile()) {
          return JSON.parse(readFileSync(specOptions, 'utf-8'));
        } else {
          return JSON.parse(specOptions);
        }
      } catch (error) {
        logger.error(
          `Encountered error:\n\n${specOptions}\n\nis neither a file with a valid JSON object neither a stringified JSON object.\n`
        );
        throw new HandledError(error instanceof Error ? error.message : String(error));
      }
    default: {
      if (config?.configPath) {
        logger.info(`Found ${config.configPath} and using '${specType}' options\n`);
        return config.resolvedConfig[specType] ?? {};
      }
      return {};
    }
  }
}

export async function getPageHTML(
  definition: Record<string, unknown> | string,
  {
    title,
    templateFileName,
    templateOptions,
    redocOptions = {},
    redocVersion,
    disableTelemetry,
    inlineBundle,
  }: BuildDocsOptions,
  configPath?: string
) {
  logger.info('Prerendering docs\n');

  const pageOptions = { ...redocOptions, skipBundle: true };
  const prepared = await prepareApiDocs({ spec: definition, options: pageOptions });
  const app = createElement(RedoclyApiDocsStandalone, {
    items: prepared.items,
    store: prepared.store,
    basePath: '/',
    options: prepared.options,
    logo: logoFromSpec(prepared.document),
    telemetryConfig: { disabled: disableTelemetry },
    spec: prepared.document,
  });
  const sheet = new ServerStyleSheet();
  const html = renderToString(sheet.collectStyles(app));
  const css = sheet.getStyleTags();

  const customTemplate =
    templateFileName ||
    (typeof redocOptions.htmlTemplate === 'string'
      ? path.resolve(configPath ? path.dirname(configPath) : '', redocOptions.htmlTemplate)
      : undefined);

  const templateSource = customTemplate
    ? readFileSync(customTemplate, 'utf-8')
    : DEFAULT_TEMPLATE_SOURCE;
  const template = handlebars.compile(templateSource);

  const redocBundleUrl = `https://cdn.redocly.com/redoc/v${redocVersion}/bundles/redoc.standalone.js`;
  const redocScript = inlineBundle
    ? escapeClosingScriptTag(readFileSync(redocStandalonePath, 'utf-8'))
    : `import { hydrate } from "${redocBundleUrl}";`;
  const redocHead = inlineBundle
    ? css
    : `<link rel="modulepreload" href="${redocBundleUrl}" integrity="${getRedocStandaloneSri()}" crossorigin="anonymous" />` +
      css;

  const definitionTitle =
    typeof definition === 'string'
      ? undefined
      : (definition.info as { title?: string } | undefined)?.title;

  return template({
    redocHTML: `
      <div id="redoc">${html}</div>
      <script type="module">
      ${redocScript}

      const __redoc_definition = ${sanitizeJSONString(JSON.stringify(definition))};
      const __redoc_options = ${sanitizeJSONString(
        JSON.stringify({ ...pageOptions, disableTelemetry })
      )};

      hydrate(__redoc_definition, __redoc_options, document.getElementById('redoc'));
      </script>`,
    redocHead,
    title: title || definitionTitle || 'ReDoc documentation',
    templateOptions,
  });
}

const redocStandalonePath = fileURLToPath(new URL('./redoc.standalone.js', import.meta.url));

function getRedocStandaloneSri(): string {
  const hash = createHash('sha384').update(readFileSync(redocStandalonePath)).digest('base64');
  return `sha384-${hash}`;
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

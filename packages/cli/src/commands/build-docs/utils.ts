import { createElement } from 'react';
import { default as redoc } from 'redoc';
import { renderToString } from 'react-dom/server';
import { ServerStyleSheet } from 'styled-components';
import { default as handlebars } from 'handlebars';
import { dirname, join, resolve } from 'node:path';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { red } from 'colorette';
import { isAbsoluteUrl } from '@redocly/openapi-core';
import { exitWithError } from '../../utils/miscellaneous.js';
import { fileURLToPath } from 'node:url';

import type { Config } from '@redocly/openapi-core';
import type { BuildDocsOptions } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function getObjectOrJSON(
  openapiOptions: string | Record<string, unknown>,
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
        process.stderr.write(
          red(
            `Encountered error:\n\n${openapiOptions}\n\nis neither a file with a valid JSON object neither a stringified JSON object.`
          )
        );
        exitWithError(e);
      }
      break;
    default: {
      if (config) {
        process.stdout.write(`Found ${config.configFile} and using theme.openapi options\n`);

        return config.theme.openapi ? config.theme.openapi : {}; // FIXME: ? theme is deprecated
      }
      return {};
    }
  }
  return {};
}

export async function getPageHTML(
  api: any,
  pathToApi: string,
  {
    title,
    disableGoogleFont,
    templateFileName,
    templateOptions,
    redocOptions = {},
    redocCurrentVersion,
  }: BuildDocsOptions,
  configPath?: string
) {
  process.stdout.write('Prerendering docs\n');

  const apiUrl = redocOptions.specUrl || (isAbsoluteUrl(pathToApi) ? pathToApi : undefined);
  const store = await redoc.createStore(api, apiUrl, redocOptions);
  const sheet = new ServerStyleSheet();

  const html = renderToString(sheet.collectStyles(createElement(redoc.Redoc, { store })));
  const state = await store.toJS();
  const css = sheet.getStyleTags();

  templateFileName = templateFileName
    ? templateFileName
    : redocOptions?.htmlTemplate
    ? resolve(configPath ? dirname(configPath) : '', redocOptions.htmlTemplate)
    : join(__dirname, './template.hbs');
  const template = handlebars.compile(readFileSync(templateFileName).toString());
  return template({
    redocHTML: `
      <div id="redoc">${html || ''}</div>
      <script>
      ${`const __redoc_state = ${sanitizeJSONString(JSON.stringify(state))};` || ''}

      var container = document.getElementById('redoc');
      Redoc.${'hydrate(__redoc_state, container)'};

      </script>`,
    redocHead:
      `<script src="https://cdn.redocly.com/redoc/v${redocCurrentVersion}/bundles/redoc.standalone.js"></script>` +
      css,
    title: title || api.info.title || 'ReDoc documentation',
    disableGoogleFont,
    templateOptions,
  });
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

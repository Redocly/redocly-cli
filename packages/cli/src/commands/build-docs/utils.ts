import * as React from 'react';
import { createStore, Redoc } from 'redoc';
import { parseYaml, findConfig, Config } from '@redocly/openapi-core';
import { renderToString } from 'react-dom/server';
import { ServerStyleSheet } from 'styled-components';
import { compile } from 'handlebars';
import { join } from 'path';
import { existsSync, lstatSync, readFileSync } from 'fs';

import type { BuildDocsOptions } from './types';

export function getObjectOrJSON(
  options: string | Record<string, unknown>
): JSON | Record<string, unknown> | Config {
  const configFile = findConfig();
  switch (typeof options) {
    case 'object':
      return options;
    case 'string':
      try {
        if (existsSync(options) && lstatSync(options).isFile()) {
          return JSON.parse(readFileSync(options, 'utf-8'));
        } else {
          return JSON.parse(options);
        }
      } catch (e) {
        console.log(
          `Encountered error:\n\n${options}\n\nis neither a file with a valid JSON object neither a stringified JSON object.`
        );
        handleError(e);
      }
      break;
    default:
      if (configFile) {
        console.log(`Found ${configFile} and using features.openapi options`);
        try {
          const config = parseYaml(readFileSync(configFile, 'utf-8')) as Config;

          return config['features.openapi'];
        } catch (e) {
          console.warn(`Found ${configFile} but failed to parse: ${e.message}`);
        }
      }
      return {};
  }
  return {};
}

export async function getPageHTML(
  spec: any,
  pathToSpec: string,
  {
    cdn,
    title,
    disableGoogleFont,
    templateFileName,
    templateOptions,
    redocOptions = {},
    redocCurrentVersion,
  }: BuildDocsOptions
) {
  console.log('Prerendering docs');

  const specUrl = redocOptions.specUrl || (isURL(pathToSpec) ? pathToSpec : undefined);
  const store = await createStore(spec, specUrl, redocOptions);
  const sheet = new ServerStyleSheet();

  const html = renderToString(sheet.collectStyles(React.createElement(Redoc, { store })));
  const state = await store.toJS();
  const css = sheet.getStyleTags();

  templateFileName = templateFileName ? templateFileName : join(__dirname, './template.hbs');
  const template = compile(readFileSync(templateFileName).toString());
  return template({
    redocHTML: `
      <div id="redoc">${html || ''}</div>
      <script>
      ${`const __redoc_state = ${sanitizeJSONString(JSON.stringify(state))};` || ''}

      var container = document.getElementById('redoc');
      Redoc.${'hydrate(__redoc_state, container)'};

      </script>`,
    redocHead:
      (cdn
        ? '<script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>'
        : `<script src="https://cdn.redoc.ly/redoc/${redocCurrentVersion}/bundles/redoc.standalone.js"></script>`) +
      css,
    title: title || spec.info.title || 'ReDoc documentation',
    disableGoogleFont,
    templateOptions,
  });
}

export function isURL(str: string): boolean {
  return /^(https?:)\/\//m.test(str);
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

export function handleError(error: Error) {
  console.error(error.stack);
  process.exit(1);
}

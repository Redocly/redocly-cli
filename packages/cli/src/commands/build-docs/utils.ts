import { createElement } from 'react';
import { Redoc, ServerStyleSheet } from 'redoc';
import { renderToString } from 'react-dom/server';
import { default as handlebars } from 'handlebars';
import * as path from 'node:path';
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { logger } from '@redocly/openapi-core';
import * as url from 'node:url';
import { exitWithError } from '../../utils/error.js';

import type { Config } from '@redocly/openapi-core';
import type { BuildDocsOptions } from './types.js';

const __internalDirname = import.meta.url
  ? path.dirname(url.fileURLToPath(import.meta.url))
  : __dirname;

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
  definition: any,
  {
    title,
    disableGoogleFont,
    templateFileName,
    templateOptions,
    redocOptions = {},
    redocVersion,
  }: BuildDocsOptions,
  configPath?: string,
  inlineBundle?: boolean
) {
  const sheet = new ServerStyleSheet();
  const html = renderToString(
    sheet.collectStyles(
      createElement(Redoc, {
        store: {
          options: redocOptions,
          definition,
        },
        router: 'memory',
        withCommonStyles: true,
      })
    )
  );

  templateFileName = templateFileName
    ? templateFileName
    : redocOptions?.htmlTemplate
    ? path.resolve(configPath ? path.dirname(configPath) : '', redocOptions.htmlTemplate)
    : path.join(__internalDirname, './template.hbs');
  const template = handlebars.compile(readFileSync(templateFileName).toString());
  const redocLib = await getRedocLibrary(redocVersion, inlineBundle);

  const hydrationScript = inlineBundle
    ? `
    <div id="redoc">${html}</div>
    <script type="module">
      const dataUrl = "${redocLib}";
      import(dataUrl).then((Redoc) => {
        const __redoc_state = ${sanitizeJSONString(
          JSON.stringify({
            options: redocOptions,
            definition,
          })
        )};

        const container = document.getElementById('redoc');
        Redoc.hydrate(__redoc_state, container);
      }).catch(error => {
        console.error('Failed to load Redoc:', error);
      });
    </script>
  `
    : `
      <div id="redoc">${html}</div>
      <script type="module">
        ${redocLib}
        const __redoc_state = ${sanitizeJSONString(
          JSON.stringify({
            options: redocOptions,
            definition,
          })
        )};
        var container = document.getElementById('redoc');
        Redoc.hydrate(__redoc_state, container);
      </script>
    `;

  return template({
    redocHTML: hydrationScript,
    redocHead: sheet.getStyleTags(),
    title: title || definition.info.title || 'ReDoc documentation',
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

export async function getRedocLibrary(
  redocVersion: string,
  inlineBundle?: boolean
): Promise<string> {
  if (inlineBundle) {
    try {
      const response = await fetch(
        `https://cdn.redocly.com/redoc/${redocVersion}/redoc.standalone.js`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch from CDN: ${response.statusText}`);
      }

      const redocLib = await response.text();
      const sanitizedRedocLib = redocLib
        .replace(/<\/script>/gi, '<\\/script>')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');

      const encodedLib = Buffer.from(sanitizedRedocLib, 'utf8').toString('base64');
      return `data:text/javascript;base64,${encodedLib}`;
    } catch (error) {
      logger.error(`Failed to fetch Redoc from CDN: ${error.message}`);
      throw error;
    }
  }

  return `import * as Redoc from "https://cdn.redocly.com/redoc/${redocVersion}/redoc.standalone.js";`;
}

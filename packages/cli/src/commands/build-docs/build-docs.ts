import * as React from 'react';
import { createStore, loadAndBundleSpec, Redoc } from 'redoc';
import { renderToString } from 'react-dom/server';
import { ServerStyleSheet } from 'styled-components';

import { compile } from 'handlebars';
import { dirname, join, resolve } from 'path';

import { existsSync, lstatSync, readFileSync, writeFileSync } from 'fs';
import * as mkdirp from 'mkdirp';

import { parseYaml, findConfig, Config } from '@redocly/openapi-core';
import { handleError, isURL, sanitizeJSONString } from './utils';
import type { BuildDocsOptions, BuildDocsArgv } from './types';

const BUNDLES_DIR = dirname(require.resolve('redoc'));

export const handlerBuildCommand = async (argv: BuildDocsArgv) => {
  const config = {
    ssr: true,
    output: argv.o,
    cdn: argv.cdn,
    title: argv.title,
    disableGoogleFont: argv.disableGoogleFont,
    templateFileName: argv.template,
    templateOptions: argv.templateOptions || {},
    redocOptions: getObjectOrJSON(argv.options),
  };

  const pathToSpec = argv.spec;

  try {
    const start = Date.now();
    const spec = await loadAndBundleSpec(isURL(pathToSpec) ? pathToSpec : resolve(pathToSpec));
    const pageHTML = await getPageHTML(spec, pathToSpec, { ...config, ssr: true });

    mkdirp.sync(dirname(config.output));
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

function getObjectOrJSON(
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

async function getPageHTML(
  spec: any,
  pathToSpec: string,
  {
    ssr,
    cdn,
    title,
    disableGoogleFont,
    templateFileName,
    templateOptions,
    redocOptions = {},
  }: BuildDocsOptions
) {
  let html;
  let css;
  let state;
  let redocStandaloneSrc;
  if (ssr) {
    console.log('Prerendering docs');

    const specUrl = redocOptions.specUrl || (isURL(pathToSpec) ? pathToSpec : undefined);
    const store = await createStore(spec, specUrl, redocOptions);
    const sheet = new ServerStyleSheet();

    html = renderToString(sheet.collectStyles(React.createElement(Redoc, { store })));
    css = sheet.getStyleTags();
    state = await store.toJS();

    if (!cdn) {
      redocStandaloneSrc = readFileSync(join(BUNDLES_DIR, 'redoc.standalone.js'));
    }
  }

  templateFileName = templateFileName ? templateFileName : join(__dirname, './template.hbs');
  const template = compile(readFileSync(templateFileName).toString());
  return template({
    redocHTML: `
      <div id="redoc">${(ssr && html) || ''}</div>
      <script>
      ${(ssr && `const __redoc_state = ${sanitizeJSONString(JSON.stringify(state))};`) || ''}

      var container = document.getElementById('redoc');
      Redoc.${
        ssr
          ? 'hydrate(__redoc_state, container)'
          : `init("spec.json", ${JSON.stringify(redocOptions)}, container)`
      };

      </script>`,
    redocHead: ssr
      ? (cdn
          ? '<script src="https://unpkg.com/redoc@latest/bundles/redoc.standalone.js"></script>'
          : `<script>${redocStandaloneSrc}</script>`) + css
      : '<script src="redoc.standalone.js"></script>',
    title: title || spec.info.title || 'ReDoc documentation',
    disableGoogleFont,
    templateOptions,
  });
}

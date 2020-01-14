// import { watch } from 'chokidar';
import { compile } from 'handlebars';
import chalk from 'chalk';
import * as portfinder from 'portfinder';


import { readFileSync, promises as fsPromises } from 'fs';
import * as path from 'path';

import {
  startHttpServer, startWsServer, respondWithGzip, mimeTypes,
} from './server';

function getPageHTML(htmlTemplate, redocOptions = {}, wsPort) {
  const template = compile(readFileSync(htmlTemplate, 'utf-8'));
  return template({
    redocHead: `
  <script>
    window.__REDOC_EXPORT = '${redocOptions.licenseKey ? 'RedoclyAPIReference' : 'Redoc'}';
    window.__OPENAPI_CLI_WS_PORT = ${wsPort};
  </script>
  <script src="/simplewebsocket.min.js"></script>
  <script src="/hot.js"></script>
  <script src="${redocOptions.licenseKey
    ? 'https://cdn.jsdelivr.net/npm/@redocly/api-reference@latest/dist/redocly-api-reference.min.js'
    : 'https://cdn.jsdelivr.net/npm/redoc@latest/bundles/redoc.standalone.js'}"></script>
`,
    redocHTML: `
  <div id="redoc"></div>
  <script>
    var container = document.getElementById('redoc');
    window[window.__REDOC_EXPORT].init("openapi.json", ${JSON.stringify(redocOptions)}, container)
  </script>`,
  });
}

export default async function startPreviewServer(port, {
  getBundle,
  getOptions,
  htmlTemplate = path.join(__dirname, 'default.hbs'),
}) {
  const handler = async (request, response) => {
    console.time(chalk.dim(`GET ${request.url}`));
    if (request.url === '/') {
      respondWithGzip(getPageHTML(htmlTemplate, getOptions(), wsPort), request, response, {
        'Content-Type': 'text/html',
      });
    } else if (request.url === '/openapi.json') {
      respondWithGzip(JSON.stringify(await getBundle()), request, response, {
        'Content-Type': 'application/json',
      });
    } else {
      const filePath = {
        '/hot.js': path.join(__dirname, 'hot.js'),
        '/simplewebsocket.min.js': require.resolve('simple-websocket/simplewebsocket.min.js'),
      }[request.url] || path.resolve(path.dirname(htmlTemplate), `.${request.url}`);

      const extname = String(path.extname(filePath)).toLowerCase();

      const contentType = mimeTypes[extname] || 'application/octet-stream';
      try {
        respondWithGzip(await fsPromises.readFile(filePath, 'utf-8'), request, response, {
          'Content-Type': contentType,
        });
      } catch (e) {
        if (e.code === 'ENOENT') {
          respondWithGzip('404 Not Found', request, response, { 'Content-Type': 'text/html' }, 404);
        } else {
          respondWithGzip(`Something went wrong: ${e.code}...\n`, request, response, {}, 500);
        }
      }
    }
    console.timeEnd(chalk.dim(`GET ${request.url}`));
  };

  let wsPort = await portfinder.getPortPromise({ port: 32201 });

  const server = startHttpServer(port, handler);
  server.on('listening', () => {
    process.stdout.write(`  🔎  Preview server running at ${chalk.blue(`http://127.0.0.1:${port}\n`)}`);
  });

  return startWsServer(wsPort);
}

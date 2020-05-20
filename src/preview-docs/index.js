// import { watch } from 'chokidar';
import { compile } from 'handlebars';
import chalk from 'chalk';
import * as portfinder from 'portfinder';


import { readFileSync, promises as fsPromises } from 'fs';
import * as path from 'path';

import {
  startHttpServer, startWsServer, respondWithGzip, mimeTypes,
} from './server';

function getPageHTML(htmlTemplate, redocOptions = {}, useRedocPro, wsPort) {
  let templateSrc = readFileSync(htmlTemplate, 'utf-8');

  // fix template for backward compatibility
  templateSrc = templateSrc
    .replace(/{?{{redocHead}}}?/, '{{{redocHead}}}')
    .replace('{{redocBody}}', '{{{redocHTML}}}');

  const template = compile(templateSrc);

  return template({
    redocHead: `
  <script>
    window.__REDOC_EXPORT = '${useRedocPro ? 'RedoclyAPIReference' : 'Redoc'}';
    window.__OPENAPI_CLI_WS_PORT = ${wsPort};
  </script>
  <script src="/simplewebsocket.min.js"></script>
  <script src="/hot.js"></script>
  <script src="${useRedocPro
    ? 'https://cdn.jsdelivr.net/npm/@redocly/api-reference@latest/dist/redocly-api-reference.min.js'
    : 'https://cdn.jsdelivr.net/npm/redoc@latest/bundles/redoc.standalone.js'}"></script>
`,
    redocHTML: `
  <div id="redoc"></div>
  <script>
    var container = document.getElementById('redoc');
    ${useRedocPro ? "window[window.__REDOC_EXPORT].setPublicPath('https://cdn.jsdelivr.net/npm/@redocly/api-reference@latest/dist/');" : ''}
    window[window.__REDOC_EXPORT].init("openapi.json", ${JSON.stringify(redocOptions)}, container)
  </script>`,
  });
}

export default async function startPreviewServer(port, {
  getBundle,
  getOptions,
  useRedocPro,
}) {
  const defaultTemplate = path.join(__dirname, 'default.hbs');
  const handler = async (request, response) => {
    console.time(chalk.dim(`GET ${request.url}`));
    const { htmlTemplate } = getOptions() || {};

    if (request.url === '/') {
      respondWithGzip(getPageHTML(htmlTemplate || defaultTemplate, getOptions(), useRedocPro, wsPort), request, response, {
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
      }[request.url] || path.resolve(htmlTemplate ? path.dirname(htmlTemplate) : process.cwd(), `.${request.url}`);

      const extname = String(path.extname(filePath)).toLowerCase();

      const contentType = mimeTypes[extname] || 'application/octet-stream';
      try {
        respondWithGzip(await fsPromises.readFile(filePath), request, response, {
          'Content-Type': contentType,
        });
      } catch (e) {
        if (e.code === 'ENOENT') {
          respondWithGzip('404 Not Found', request, response, { 'Content-Type': 'text/html' }, 404);
        } else {
          respondWithGzip(`Something went wrong: ${e.code || e.message}...\n`, request, response, {}, 500);
        }
      }
    }
    console.timeEnd(chalk.dim(`GET ${request.url}`));
  };

  let wsPort = await portfinder.getPortPromise({ port: 32201 });

  const server = startHttpServer(port, handler);
  server.on('listening', () => {
    process.stdout.write(`\n  🔎  Preview server running at ${chalk.blue(`http://127.0.0.1:${port}\n`)}`);
  });

  return startWsServer(wsPort);
}

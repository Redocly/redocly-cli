import { compile } from 'handlebars';
import * as colorette from 'colorette';
import * as portfinder from 'portfinder';
import { readFileSync, promises as fsPromises } from 'fs';
import * as path from 'path';

import { startHttpServer, startWsServer, respondWithGzip, mimeTypes } from './server';
import type { IncomingMessage } from 'http';
import { isSubdir } from '../../../utils';

function getPageHTML(
  htmlTemplate: string,
  redocOptions: object = {},
  useRedocPro: boolean,
  wsPort: number,
) {
  let templateSrc = readFileSync(htmlTemplate, 'utf-8');

  // fix template for backward compatibility
  templateSrc = templateSrc
    .replace(/{?{{redocHead}}}?/, '{{{redocHead}}}')
    .replace('{{redocBody}}', '{{{redocHTML}}}');

  const template = compile(templateSrc);

  return template({
    redocHead: `
  <script>
    window.__REDOC_EXPORT = '${useRedocPro ? 'RedoclyReferenceDocs' : 'Redoc'}';
    window.__OPENAPI_CLI_WS_PORT = ${wsPort};
  </script>
  <script src="/simplewebsocket.min.js"></script>
  <script src="/hot.js"></script>
  <script src="${
    useRedocPro
      ? 'https://cdn.jsdelivr.net/npm/@redocly/reference-docs@latest/dist/redocly-reference-docs.min.js'
      : 'https://cdn.jsdelivr.net/npm/redoc@latest/bundles/redoc.standalone.js'
  }"></script>
`,
    redocHTML: `
  <div id="redoc"></div>
  <script>
    var container = document.getElementById('redoc');
    ${
      useRedocPro
        ? "window[window.__REDOC_EXPORT].setPublicPath('https://cdn.jsdelivr.net/npm/@redocly/reference-docs@latest/dist/');"
        : ''
    }
    window[window.__REDOC_EXPORT].init("/openapi.json", ${JSON.stringify(redocOptions)}, container)
  </script>`,
  });
}

export default async function startPreviewServer(
  port: number,
  host: string,
  {
    getBundle,
    getOptions,
    useRedocPro,
  }: { getBundle: Function; getOptions: Function; useRedocPro: boolean },
) {
  const defaultTemplate = path.join(__dirname, 'default.hbs');
  const handler = async (request: IncomingMessage, response: any) => {
    console.time(colorette.dim(`GET ${request.url}`));
    const { htmlTemplate } = getOptions() || {};

    if (request.url?.endsWith('/') || path.extname(request.url!) === '') {
      respondWithGzip(
        getPageHTML(htmlTemplate || defaultTemplate, getOptions(), useRedocPro, wsPort),
        request,
        response,
        {
          'Content-Type': 'text/html',
        },
      );
    } else if (request.url === '/openapi.json') {
      const bundle = await getBundle();
      if (bundle === undefined) {
        respondWithGzip(
          JSON.stringify({
            openapi: '3.0.0',
            info: {
              description:
                '<code> Failed to generate bundle: check out console output for more details </code>',
            },
            paths: {},
          }),
          request,
          response,
          {
            'Content-Type': 'application/json',
          },
        );
      } else {
        respondWithGzip(JSON.stringify(bundle), request, response, {
          'Content-Type': 'application/json',
        });
      }
    } else {
      const filePath =
        // @ts-ignore
        {
          '/hot.js': path.join(__dirname, 'hot.js'),
          '/oauth2-redirect.html': path.join(__dirname, 'oauth2-redirect.html'),
          '/simplewebsocket.min.js': require.resolve('simple-websocket/simplewebsocket.min.js'),
        }[request.url || ''] ||
        path.resolve(htmlTemplate ? path.dirname(htmlTemplate) : process.cwd(), `.${request.url}`);

      if (!isSubdir(process.cwd(), filePath)) {
        respondWithGzip('404 Not Found', request, response, { 'Content-Type': 'text/html' }, 404);
        console.timeEnd(colorette.dim(`GET ${request.url}`));
        return;
      }

      const extname = String(path.extname(filePath)).toLowerCase() as keyof typeof mimeTypes;

      const contentType = mimeTypes[extname] || 'application/octet-stream';
      try {
        respondWithGzip(await fsPromises.readFile(filePath), request, response, {
          'Content-Type': contentType,
        });
      } catch (e) {
        if (e.code === 'ENOENT') {
          respondWithGzip('404 Not Found', request, response, { 'Content-Type': 'text/html' }, 404);
        } else {
          respondWithGzip(
            `Something went wrong: ${e.code || e.message}...\n`,
            request,
            response,
            {},
            500,
          );
        }
      }
    }
    console.timeEnd(colorette.dim(`GET ${request.url}`));
  };

  let wsPort = await portfinder.getPortPromise({ port: 32201 });

  const server = startHttpServer(port, host, handler);
  server.on('listening', () => {
    process.stdout.write(
      `\n  🔎  Preview server running at ${colorette.blue(`http://${host}:${port}\n`)}`,
    );
  });

  return startWsServer(wsPort);
}

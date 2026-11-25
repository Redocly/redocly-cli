import { once } from 'node:events';
import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getParams, runCommandAsync } from '../../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

type Request = { method?: string; url?: string; authorization?: string; body: string };

let server: Server;
let port: number;
let redirectExchange = false;
const requests: Request[] = [];

async function readBody(request: IncomingMessage) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
  }
  return body;
}

beforeAll(async () => {
  server = createServer(async (request, response) => {
    requests.push({
      method: request.method,
      url: request.url,
      authorization: request.headers.authorization,
      body: await readBody(request),
    });

    if (request.url?.startsWith('/token')) {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ value: 'github-jwt' }));
      return;
    }

    if (redirectExchange) {
      response.statusCode = 307;
      response.setHeader('location', `http://127.0.0.1:${port}/elsewhere`);
      response.end();
      return;
    }

    response.statusCode = 403;
    response.setHeader('content-type', 'application/problem+json');
    response.end(
      JSON.stringify({
        title: 'No trusted repository matches the token',
        detail: 'repository: acme/docs, ref: refs/heads/main.',
      })
    );
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  port = (server.address() as AddressInfo).port;
});

afterAll(() => {
  server.closeAllConnections();
  server.close();
});

beforeEach(() => {
  requests.length = 0;
  redirectExchange = false;
});

function runPush() {
  const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
  const args = getParams(indexEntryPoint, [
    'push',
    join(__dirname, 'openapi.yaml'),
    '--organization',
    'cafe',
    '--project',
    'docs',
    '--domain',
    `http://127.0.0.1:${port}`,
    '--mount-path',
    'docs/cafe',
    '--branch',
    'main',
    '--author',
    'Redocly <cafe@redocly.com>',
    '--message',
    'Push the Cafe API',
  ]);

  return runCommandAsync('node', args, {
    env: {
      REDOCLY_AUTHORIZATION: '',
      ACTIONS_ID_TOKEN_REQUEST_URL: `http://127.0.0.1:${port}/token?api-version=2`,
      ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'runner-token',
      REDOCLY_TELEMETRY: 'off',
      NO_PROXY: '',
      no_proxy: '',
    },
  });
}

describe('push', () => {
  test('exchanges the GitHub Actions OIDC token and shows why the platform refused it', async () => {
    const output = await runPush();

    expect(output).toMatchSnapshot();
    expect(requests).toEqual([
      {
        method: 'GET',
        url: `/token?api-version=2&audience=${encodeURIComponent(`http://127.0.0.1:${port}`)}`,
        authorization: 'bearer runner-token',
        body: '',
      },
      {
        method: 'POST',
        url: '/api/orgs/cafe/projects/docs/oidc-credentials',
        authorization: undefined,
        body: JSON.stringify({ idToken: 'github-jwt' }),
      },
    ]);
  }, 30_000);

  test('does not follow a redirect of the exchange with the GitHub Actions OIDC token', async () => {
    redirectExchange = true;

    const output = await runPush();

    expect(output).toContain('Failed to exchange the GitHub OIDC token for an API key.');
    expect(requests.map(({ url }) => url)).not.toContain('/elsewhere');
  }, 30_000);
});

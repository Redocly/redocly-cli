import { once } from 'node:events';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getParams, runCommandAsync } from '../../helpers.js';

const FETCH_TIMEOUT_MS = 6000;
const MAX_RUN_MS = FETCH_TIMEOUT_MS + 12_000;

const __dirname = dirname(fileURLToPath(import.meta.url));

let silentServer: Server;
let silentPort: number;

beforeAll(async () => {
  silentServer = createServer(() => {});
  silentServer.on('connect', () => {});
  silentServer.listen(0, '127.0.0.1');
  await once(silentServer, 'listening');
  silentPort = (silentServer.address() as AddressInfo).port;
});

afterAll(() => {
  silentServer.closeAllConnections();
  silentServer.close();
});

async function runPush({ proxyUrl }: { proxyUrl?: string } = {}) {
  const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
  const args = getParams(indexEntryPoint, [
    'push',
    join(__dirname, 'openapi.yaml'),
    '--organization',
    'cafe',
    '--project',
    'docs',
    '--domain',
    `http://127.0.0.1:${silentPort}`,
    '--mount-path',
    'docs/cafe',
    '--branch',
    'main',
    '--author',
    'Redocly <cafe@redocly.com>',
    '--message',
    'Push the Cafe API',
  ]);
  const startedAt = Date.now();
  const output = await runCommandAsync('node', args, {
    env: {
      REDOCLY_AUTHORIZATION: 'test-api-key',
      REDOCLY_TELEMETRY: 'off',
      NO_PROXY: '',
      no_proxy: '',
      ...(proxyUrl && {
        HTTPS_PROXY: proxyUrl,
        HTTP_PROXY: proxyUrl,
        https_proxy: proxyUrl,
        http_proxy: proxyUrl,
      }),
    },
  });

  return { output, elapsed: Date.now() - startedAt };
}

describe('push', () => {
  test('fails the push when the API does not answer within the fetch timeout', async () => {
    const { output, elapsed } = await runPush();

    expect(output).toMatchSnapshot();
    expect(elapsed).toBeGreaterThanOrEqual(FETCH_TIMEOUT_MS);
    expect(elapsed).toBeLessThan(MAX_RUN_MS);
  }, 60_000);

  test('fails the push when the proxy does not answer within the fetch timeout', async () => {
    const { output, elapsed } = await runPush({ proxyUrl: `http://127.0.0.1:${silentPort}` });

    expect(output).toMatchSnapshot();
    expect(elapsed).toBeGreaterThanOrEqual(FETCH_TIMEOUT_MS);
    expect(elapsed).toBeLessThan(MAX_RUN_MS);
  }, 60_000);
});

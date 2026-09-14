import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';

import { getCommandOutput, getParams } from '../helpers.js';

const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
const testPath = join(process.cwd(), 'tests/e2e/telemetry');

describe('telemetry', () => {
  let server: Server;

  afterEach(() => {
    server?.close();
  });

  test('sends the command event from a background process after the CLI exits', async () => {
    const receivedEvent = new Promise<string>((resolve) => {
      server = createServer((request, response) => {
        let body = '';
        request.on('data', (chunk) => (body += chunk));
        request.on('end', () => {
          response.end('{}');
          resolve(body);
        });
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;

    const output = getCommandOutput(getParams(indexEntryPoint, ['lint', 'openapi.yaml']), {
      testPath,
      env: { REDOCLY_TELEMETRY: 'on', OTEL_TRACES_URL: `http://127.0.0.1:${port}/v1/traces` },
    });

    expect(output).toContain('openapi.yaml: validated in');
    expect(await receivedEvent).toContain('urn:redocly:cli:command:lint');
  }, 15000);
});

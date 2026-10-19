import { generateClient } from '@redocly/client-generator';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyConsumer, runConsumer, runTsx, strictTypecheck } from '../../helpers/helpers.js';
import { MockServer } from '../../helpers/mock-server.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, 'openapi.yaml');

describe('generate-client auth breadth', () => {
  let server: MockServer;
  let dir = '';
  let splitDir = '';

  beforeAll(async () => {
    server = await MockServer.start(fixture);
    dir = copyConsumer(join(__dirname, 'consumer'));
    await generateClient({ api: fixture, output: join(dir, 'client.ts') });
  });

  afterAll(async () => {
    await server.close();
    rmSync(dir, { recursive: true, force: true });
    rmSync(splitDir, { recursive: true, force: true });
  });

  it('strict-tsc accepts the single-file client', () => {
    strictTypecheck(dir, ['client.ts']);
  });

  it('strict-tsc accepts the split two-file client', async () => {
    // Split mode derives its folder from a `.ts` entry path, so `output`
    // must still point at a file; the generator emits the schemas file beside it.
    splitDir = mkdtempSync(join(tmpdir(), 'ots-auth-split-'));
    await generateClient({
      api: fixture,
      output: join(splitDir, 'client.ts'),
      outputMode: 'split',
    });
    strictTypecheck(splitDir);
  });

  it('each operation sends the credential of its scheme on the wire', async () => {
    const result = await runTsx(join(dir, 'send-credentials.ts'), [server.url]);
    expect(result.status, `consumer failed:\n${result.stdout}\n${result.stderr}`).toBe(0);

    expect(server.requests).toHaveLength(5);
    // The bearer token comes from an async provider.
    expect(server.requests[0]).toMatchObject({
      operationId: 'getBearer',
      headers: { authorization: 'Bearer tok' },
    });
    expect(server.requests[1]).toMatchObject({
      operationId: 'getBasic',
      headers: { authorization: 'Basic ' + Buffer.from('alice:pw').toString('base64') },
    });
    expect(server.requests[2].operationId).toBe('getQuery');
    expect(server.requests[2].query).toEqual({ limit: '5', api_key: 'secret-key' });
    expect(server.requests[3]).toMatchObject({
      operationId: 'getCookie',
      headers: { cookie: 'sid=cookie%20value' },
    });
    expect(server.requests[4]).toMatchObject({
      operationId: 'getHeader',
      headers: { 'x-key': 'header-key' },
    });
    expect(server.handlerErrors).toEqual([]);
  });

  it('createClient instances keep their own credentials: an authed one sends Basic, a no-auth one sends none', async () => {
    const calls = (await runConsumer(join(dir, 'instance-credentials.ts'))) as (string | null)[];

    expect(calls).toEqual(['Basic ' + Buffer.from('alice:pw').toString('base64'), null]);
  });
});

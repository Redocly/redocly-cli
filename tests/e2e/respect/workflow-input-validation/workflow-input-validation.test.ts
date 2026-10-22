import { once } from 'node:events';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runCommandResultAsync } from '../../helpers.js';

const fixturesPath = dirname(fileURLToPath(import.meta.url));
const sentinel = 'synthetic-input-secret-sentinel';
const requests: { path: string | undefined; key: string | string[] | undefined; body: string }[] =
  [];
const effects: number[] = [];
const server = createServer(async (request, response) => {
  let body = '';
  for await (const chunk of request) body += chunk;
  requests.push({ path: request.url, key: request.headers['x-caller-key'], body });
  effects.push(effects.length + 1);
  response.writeHead(200, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ id: effects.length, accepted: true }));
});

beforeAll(async () => {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
});

beforeEach(() => {
  requests.length = 0;
  effects.length = 0;
});

afterAll(async () => {
  server.close();
  server.closeAllConnections();
  await once(server, 'close');
});

function runWorkflow(workflow: string, inputs: Record<string, unknown>, env = {}) {
  return runCommandResultAsync(
    process.execPath,
    [
      join(process.cwd(), 'packages/cli/lib/index.js'),
      'respect',
      join(fixturesPath, 'workflow-input-validation.arazzo.yaml'),
      '--workflow',
      workflow,
      '--server',
      `cafe=http://127.0.0.1:${(server.address() as AddressInfo).port}`,
      '--input',
      JSON.stringify(inputs),
      '--verbose',
    ],
    { env: { CAFE_CALLER_KEY: '', ...env }, timeout: 20_000 }
  );
}

test.each([
  ['create-order', { text: 'One latte' }],
  ['create-order', { callerKey: sentinel }],
  ['create-order', { callerKey: sentinel, text: '' }],
  ['create-order', { callerKey: { secret: sentinel }, text: 'One latte' }],
  ['with-dependency', { callerKey: sentinel }],
  ['with-invalid-dependency', { callerKey: sentinel, text: 'One latte' }],
  ['invoke-order', { orderText: '' }],
  ['environment-order', { text: 'One latte' }],
])('rejects invalid inputs before requests or effects: %s %j', async (workflow, inputs) => {
  const result = await runWorkflow(workflow, inputs);

  expect(result.status).toBe(1);
  expect(result.stdout + result.stderr).toContain('Invalid workflow inputs:');
  expect(result.stdout + result.stderr).not.toContain(sentinel);
  expect(requests).toEqual([]);
  expect(effects).toEqual([]);
});

test('recovers after rejection and leaves an unused workflow unbound', async () => {
  const rejected = await runWorkflow('create-order', { callerKey: sentinel });
  expect(rejected.status).toBe(1);
  expect(requests).toEqual([]);
  expect(effects).toEqual([]);

  const accepted = await runWorkflow('create-order', {
    callerKey: 'recovery-key',
    text: 'One latte',
    count: '2',
    extra: 'removed',
  });
  expect(accepted.status).toBe(0);
  expect(requests).toEqual([
    { path: '/orders', key: 'recovery-key', body: '{"text":"One latte","count":2}' },
  ]);
  expect(effects).toEqual([1]);
});

test('validates inputs passed at workflow invocation', async () => {
  const result = await runWorkflow('invoke-order', { orderText: 'One espresso' });

  expect(result.status).toBe(0);
  expect(requests).toEqual([
    { path: '/orders', key: 'runtime-key', body: '{"text":"One espresso","count":1}' },
  ]);
  expect(effects).toEqual([1]);
});

test('validates environment inputs after merging their values and defaults', async () => {
  const result = await runWorkflow(
    'environment-order',
    { text: 'One mocha' },
    { CAFE_CALLER_KEY: 'environment-key' }
  );

  expect(result.status).toBe(0);
  expect(requests).toEqual([
    { path: '/orders', key: 'environment-key', body: '{"text":"One mocha","region":"local"}' },
  ]);
  expect(effects).toEqual([1]);
});

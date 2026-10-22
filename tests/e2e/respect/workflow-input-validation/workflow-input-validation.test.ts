import type { JsonLogs } from '@redocly/respect-core';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
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
])('rejects invalid inputs before requests or effects: %s', async (workflow, inputs) => {
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

async function runContinuity(
  workflows: string[],
  laterFile = false,
  inputs: Record<string, unknown> = {}
) {
  const outputDir = await mkdtemp(join(tmpdir(), 'respect-input-validation-'));
  const outputPath = join(outputDir, 'results.json');
  try {
    const result = await runCommandResultAsync(
      process.execPath,
      [
        join(process.cwd(), 'packages/cli/lib/index.js'),
        'respect',
        join(fixturesPath, 'failure-continuity.arazzo.yaml'),
        ...(laterFile ? [join(fixturesPath, 'workflow-input-validation.arazzo.yaml')] : []),
        '--workflow',
        workflows.join(','),
        '--json-output',
        outputPath,
        '--input',
        JSON.stringify(inputs),
        '--server',
        `cafe=http://127.0.0.1:${(server.address() as AddressInfo).port}`,
        '--verbose',
      ],
      { timeout: 20_000 }
    );
    const logs = JSON.parse(await readFile(outputPath, 'utf8')) as JsonLogs;
    return { ...result, logs };
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
}

test.each(['invalid-parent', 'invalid-dependency', 'deep-dependency'])(
  'isolates %s and still executes a following workflow and file',
  async (workflow) => {
    const result = await runContinuity([workflow, 'following', 'prepare-order'], true);

    expect(result.status).toBe(1);
    expect(result.stdout + result.stderr).toContain('Invalid workflow inputs:');
    expect(requests.map((request) => request.path)).toEqual(['/preparations', '/preparations']);
    expect(effects).toEqual([1, 2]);
    expect(result.logs.status).toBe('error');
    const files = Object.values(result.logs.files);
    expect(files).toHaveLength(2);
    expect(files[0].executedWorkflows.map((workflow) => workflow.status)).toEqual([
      'error',
      'success',
    ]);
    expect(files[0].executedWorkflows[0].executedSteps).toHaveLength(1);
    expect(files[1].executedWorkflows[0].status).toBe('success');
  }
);

test.each(['invoke-end', 'invoke-invalid-dependency'])(
  'returns a failed child result and honors end: %s',
  async (workflow) => {
    const result = await runContinuity([workflow]);

    expect(result.status).toBe(1);
    expect(result.stdout + result.stderr).toContain('Invalid workflow inputs:');
    expect(requests).toEqual([]);
    expect(effects).toEqual([]);
    const parent = Object.values(result.logs.files)[0].executedWorkflows[0];
    expect(parent.status).toBe('error');
    expect(parent.executedSteps).toHaveLength(1);
    expect(parent.executedSteps[0]).toMatchObject({
      type: 'workflow',
      status: 'error',
      executedSteps: [{ checks: [{ passed: false }] }],
    });
  }
);

test('honors goto after invalid child inputs without running intervening steps', async () => {
  const result = await runContinuity(['invoke-goto']);

  expect(result.status).toBe(1);
  expect(requests.map((request) => request.path)).toEqual(['/preparations']);
  expect(effects).toEqual([1]);
});

test('uses workflow failure actions to invoke a child again with corrected inputs', async () => {
  const result = await runContinuity(['workflow-failure-action']);

  expect(result.status).toBe(1);
  expect(requests).toEqual([
    { path: '/orders', key: undefined, body: '{"text":"recovered-order"}' },
  ]);
  expect(effects).toEqual([1]);
});

test('reports a circular dependency without starting operation requests', async () => {
  const result = await runContinuity(['circular-dependency', 'following']);

  expect(result.status).toBe(1);
  expect(result.stdout + result.stderr).toContain('Circular dependsOn dependency');
  expect(requests.map((request) => request.path)).toEqual(['/preparations']);
  expect(effects).toEqual([1]);
});

test('runs valid dependencies before the selected workflow with mapped inputs', async () => {
  const result = await runWorkflow('with-dependency', {
    callerKey: 'dependency-key',
    text: 'One flat white',
  });

  expect(result.status).toBe(0);
  expect(requests).toEqual([
    { path: '/preparations', key: undefined, body: '' },
    { path: '/orders', key: 'dependency-key', body: '{"text":"One flat white","count":1}' },
  ]);
  expect(effects).toEqual([1, 2]);
});

test('prepares and executes valid nested dependencies with their mapped inputs', async () => {
  const result = await runContinuity(['valid-nested'], false, { text: 'Nested cortado' });

  expect(result.status).toBe(0);
  expect(requests).toEqual([
    { path: '/orders', key: undefined, body: '' },
    { path: '/orders', key: undefined, body: '{"text":"Nested cortado"}' },
    { path: '/preparations', key: undefined, body: '' },
  ]);
  expect(effects).toEqual([1, 2, 3]);
  expect(result.logs.status).toBe('success');
});

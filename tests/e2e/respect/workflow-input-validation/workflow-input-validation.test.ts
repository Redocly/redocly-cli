import type { JsonLogs } from '@redocly/respect-core';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cleanupOutput, runCommandResultAsync } from '../../helpers.js';

const fixturesPath = dirname(fileURLToPath(import.meta.url));
const sentinel = 'synthetic-input-secret-sentinel';
const menuItemId = 'prd_01h1s5z6vf2mm1mz3hevnn9va7';
const orderId = 'ord_01h1s5z6vf2mm1mz3hevnn9va7';
const requests: {
  method: string | undefined;
  path: string | undefined;
  key: string | string[] | undefined;
  body: string;
}[] = [];
const effects: number[] = [];
const server = createServer(async (request, response) => {
  let body = '';
  for await (const chunk of request) body += chunk;
  requests.push({
    method: request.method,
    path: request.url,
    key: request.headers['x-caller-key'],
    body,
  });
  if (request.method === 'POST' && request.url === '/orders') {
    effects.push(effects.length + 1);
    response.writeHead(201, { 'content-type': 'application/json' });
    response.end(
      JSON.stringify({
        id: orderId,
        customerName: 'Cafe Guest',
        orderItems: [{ menuItemId, quantity: 1 }],
        status: 'placed',
      })
    );
  } else if (request.method === 'GET' && request.url === '/menu') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(
      JSON.stringify({
        object: 'list',
        page: {
          endCursor: null,
          startCursor: null,
          hasNextPage: false,
          hasPrevPage: false,
          limit: 10,
          total: 0,
        },
        items: [],
      })
    );
  } else {
    response.writeHead(404);
    response.end();
  }
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

async function runFixtures(
  files: string[],
  workflows: string[],
  inputs: Record<string, unknown> = {},
  options: { env?: Record<string, string>; verbose?: boolean } = {}
) {
  const outputDir = await mkdtemp(join(tmpdir(), 'respect-input-validation-'));
  const outputPath = join(outputDir, 'results.json');
  const serverUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const commandResult = await runCommandResultAsync(
      process.execPath,
      [
        join(process.cwd(), 'packages/cli/lib/index.js'),
        'respect',
        ...files.map((file) => join(fixturesPath, file)),
        '--workflow',
        workflows.join(','),
        '--json-output',
        outputPath,
        '--input',
        JSON.stringify(inputs),
        '--server',
        `cafe=${serverUrl}`,
        ...(options.verbose ? ['--verbose'] : []),
      ],
      { env: { CAFE_CALLER_KEY: '', ...options.env }, timeout: 20_000 }
    );
    const result = {
      status: commandResult.status,
      stdout: cleanupOutput(commandResult.stdout)
        .replaceAll(serverUrl, 'http://127.0.0.1:<port>')
        .replaceAll(outputDir, '<outputDir>'),
      stderr: cleanupOutput(commandResult.stderr)
        .replaceAll(serverUrl, 'http://127.0.0.1:<port>')
        .replaceAll(outputDir, '<outputDir>'),
    };
    const logs = JSON.parse(
      await readFile(outputPath, 'utf8').catch((error) => {
        throw new Error(JSON.stringify(result), { cause: error });
      })
    ) as JsonLogs;
    return { result, logs };
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
}

function runWorkflow(workflow: string, inputs: Record<string, unknown> = {}, env = {}) {
  return runFixtures(['workflow-input-validation.arazzo.yaml'], [workflow], inputs, {
    env,
    verbose: true,
  });
}

function runContinuity(
  workflows: string[],
  laterFile = false,
  inputs: Record<string, unknown> = {}
) {
  return runFixtures(
    [
      'failure-continuity.arazzo.yaml',
      ...(laterFile ? ['workflow-input-validation.arazzo.yaml'] : []),
    ],
    workflows,
    inputs
  );
}

test.each([
  ['create-order', { customerName: 'Cafe Guest' }, 'create-order', ['/orders']],
  ['create-order', { callerKey: sentinel }, 'create-order', ['/orders']],
  ['create-order', { callerKey: sentinel, customerName: '' }, 'create-order', ['/orders']],
  ['create-order', { callerKey: sentinel, customerName: {} }, 'create-order', ['/orders']],
  [
    'with-dependency',
    { callerKey: sentinel, customerName: '' },
    'with-dependency',
    ['/menu', '/orders'],
  ],
  [
    'with-invalid-dependency',
    { callerKey: sentinel, customerName: 'Cafe Guest' },
    'unbound-order',
    ['/menu', '/menu', '/orders'],
  ],
  ['invoke-order', { orderName: '' }, 'create-order', ['/orders']],
  ['environment-order', { customerName: 'Cafe Guest' }, 'environment-order', ['/orders']],
] as const)(
  'warns about invalid inputs and executes requests: %s, %j',
  async (workflow, inputs, target, paths) => {
    const { result, logs } = await runWorkflow(workflow, inputs);

    expect(result.status).toBe(0);
    expect(result.stderr).toContain(`Invalid inputs for workflow "${target}":`);
    expect(result.stderr.match(/Invalid inputs for workflow/g)).toHaveLength(1);
    expect(result.stdout + result.stderr).not.toContain(sentinel);
    expect(requests.map((request) => request.path)).toEqual(paths);
    expect(effects).toEqual([1]);
    expect(logs.status).toBe('success');
    expect(Object.values(logs.files)[0].executedWorkflows[0].status).toBe('success');
    expect(result).toMatchSnapshot();
  }
);

test('maps valid inputs after a warning and leaves unused workflows unbound', async () => {
  const warned = await runWorkflow('create-order', { callerKey: sentinel });
  expect(warned.result.status).toBe(0);
  expect(effects).toEqual([1]);
  expect(warned.result).toMatchSnapshot();

  const { result, logs } = await runWorkflow('create-order', {
    callerKey: 'recovery-key',
    customerName: 'Cafe Guest',
    quantity: '2',
    extra: 'removed',
  });
  expect(result.status).toBe(0);
  expect(result.stderr).not.toContain('input schema');
  expect(requests[1]).toEqual({
    method: 'POST',
    path: '/orders',
    key: 'recovery-key',
    body: JSON.stringify({ customerName: 'Cafe Guest', orderItems: [{ menuItemId, quantity: 2 }] }),
  });
  expect(requests).toHaveLength(2);
  expect(effects).toEqual([1, 2]);
  expect(logs.status).toBe('success');
  expect(result).toMatchSnapshot();
});

test('validates inputs passed at workflow invocation', async () => {
  const { result, logs } = await runWorkflow('invoke-order', { orderName: 'Cafe Guest' });

  expect(result.status).toBe(0);
  expect(requests).toEqual([
    {
      method: 'POST',
      path: '/orders',
      key: 'runtime-key',
      body: JSON.stringify({
        customerName: 'Cafe Guest',
        orderItems: [{ menuItemId, quantity: 1 }],
      }),
    },
  ]);
  expect(effects).toEqual([1]);
  expect(logs.status).toBe('success');
  expect(result).toMatchSnapshot();
});

test('validates environment inputs after merging their values and defaults', async () => {
  const { result, logs } = await runWorkflow(
    'environment-order',
    { customerName: 'Cafe Guest' },
    { CAFE_CALLER_KEY: 'environment-key' }
  );

  expect(result.status).toBe(0);
  expect(requests).toEqual([
    {
      method: 'POST',
      path: '/orders',
      key: 'environment-key',
      body: JSON.stringify({
        customerName: 'Cafe Guest',
        orderItems: [{ menuItemId, quantity: 1, comment: 'local' }],
      }),
    },
  ]);
  expect(effects).toEqual([1]);
  expect(logs.status).toBe('success');
  expect(result).toMatchSnapshot();
});

test.each(['scalar-order', 'array-order'])(
  'warns about a non-object schema and preserves named mappings: %s',
  async (workflow) => {
    const { result, logs } = await runWorkflow(workflow, {
      callerKey: 'reusable-key',
      customerName: 'Cafe Guest',
      quantity: 2,
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toContain(`Workflow "${workflow}" has a non-object input schema.`);
    expect(result.stderr.match(/non-object input schema/g)).toHaveLength(1);
    expect(result.stderr).not.toContain('Invalid inputs for workflow');
    expect(requests).toEqual([
      {
        method: 'POST',
        path: '/orders',
        key: 'reusable-key',
        body: JSON.stringify({
          customerName: 'Cafe Guest',
          orderItems: [{ menuItemId, quantity: 2 }],
        }),
      },
    ]);
    expect(effects).toEqual([1]);
    expect(logs.status).toBe('success');
    expect(result).toMatchSnapshot();
  }
);

test.each(['empty-schema', 'prepare-order'])(
  'does not warn about empty schemas or unused workflows: %s',
  async (workflow) => {
    const { result, logs } = await runWorkflow(workflow, { extra: 'ignored' });

    expect(result.status).toBe(0);
    expect(result.stderr).not.toContain('input schema');
    expect(requests).toEqual([{ method: 'GET', path: '/menu', key: undefined, body: '' }]);
    expect(effects).toEqual([]);
    expect(logs.status).toBe('success');
    expect(result).toMatchSnapshot();
  }
);

test.each([
  ['invalid-parent', 2, 'invalid-parent', 0],
  ['invalid-dependency', 3, 'child', 1],
  ['deep-dependency', 5, 'child', 1],
] as const)(
  'continues after %s input warnings through a following workflow and file',
  async (workflow, writes, target, missingNames) => {
    const { result, logs } = await runContinuity([workflow, 'following', 'prepare-order'], true);

    expect(result.status).toBe(0);
    expect(result.stderr).toContain(`Invalid inputs for workflow "${target}":`);
    expect(result.stderr.match(/Invalid inputs for workflow/g)).toHaveLength(1);
    expect(requests.map((request) => request.path)).toEqual([
      ...Array(writes).fill('/orders'),
      '/menu',
      '/menu',
    ]);
    expect(effects).toHaveLength(writes);
    const orderBodies = requests.slice(0, writes).map((request) => JSON.parse(request.body));
    expect(orderBodies.filter((body) => body.customerName === undefined)).toEqual(
      Array(missingNames).fill({ orderItems: [{ menuItemId, quantity: 1 }] })
    );
    expect(orderBodies.filter((body) => body.customerName !== undefined)).toEqual(
      Array(writes - missingNames).fill({
        customerName: 'Cafe Guest',
        orderItems: [{ menuItemId, quantity: 1 }],
      })
    );
    expect(logs.status).toBe('success');
    const files = Object.values(logs.files);
    expect(files).toHaveLength(2);
    expect(files[0].executedWorkflows.map((workflow) => workflow.status)).toEqual([
      'success',
      'success',
    ]);
    expect(files[1].executedWorkflows[0].status).toBe('success');
    expect(result).toMatchSnapshot();
  }
);

test.each([
  ['invoke-warning', ['/orders', '/orders']],
  ['invoke-warning-goto', ['/orders', '/orders', '/menu']],
] as const)(
  'does not trigger failure actions for an input warning: %s',
  async (workflow, paths) => {
    const { result, logs } = await runContinuity([workflow]);

    expect(result.status).toBe(0);
    expect(result.stderr).toContain('Invalid inputs for workflow "child":');
    expect(requests.map((request) => request.path)).toEqual(paths);
    expect(effects).toEqual([1, 2]);
    const parent = Object.values(logs.files)[0].executedWorkflows[0];
    expect(parent.status).toBe('success');
    expect(parent.executedSteps[0]).toMatchObject({ type: 'workflow', status: 'success' });
    expect(result).toMatchSnapshot();
  }
);

test('isolates actual dependency failures and still executes a following workflow and file', async () => {
  const { result, logs } = await runContinuity(
    ['failed-dependency', 'following', 'prepare-order'],
    true
  );

  expect(result.status).toBe(1);
  expect(result.stderr).toContain('Invalid inputs for workflow "failing-child":');
  expect(requests.map((request) => request.path)).toEqual(['/orders', '/orders', '/menu', '/menu']);
  expect(effects).toEqual([1, 2]);
  expect(logs.status).toBe('error');
  const files = Object.values(logs.files);
  expect(files[0].executedWorkflows.map((workflow) => workflow.status)).toEqual([
    'error',
    'success',
  ]);
  expect(files[0].executedWorkflows[0].executedSteps).toHaveLength(1);
  expect(files[1].executedWorkflows[0].status).toBe('success');
  expect(result).toMatchSnapshot();
});

test.each([
  ['invoke-end', 1],
  ['invoke-invalid-dependency', 2],
] as const)(
  'returns an actual failed child result and honors end: %s',
  async (workflow, writes) => {
    const { result, logs } = await runContinuity([workflow]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Invalid inputs for workflow "failing-child":');
    expect(requests.map((request) => request.path)).toEqual(Array(writes).fill('/orders'));
    expect(effects).toHaveLength(writes);
    const parent = Object.values(logs.files)[0].executedWorkflows[0];
    expect(parent.status).toBe('error');
    expect(parent.executedSteps).toHaveLength(1);
    expect(parent.executedSteps[0]).toMatchObject({
      type: 'workflow',
      status: 'error',
      executedSteps: expect.arrayContaining([
        expect.objectContaining({
          checks: expect.arrayContaining([expect.objectContaining({ passed: false })]),
        }),
      ]),
    });
    expect(result).toMatchSnapshot();
  }
);

test('honors goto after a failed response check without running intervening steps', async () => {
  const { result, logs } = await runContinuity(['invoke-goto']);

  expect(result.status).toBe(1);
  expect(requests.map((request) => request.path)).toEqual(['/orders', '/menu']);
  expect(effects).toEqual([1]);
  expect(logs.status).toBe('error');
  expect(result).toMatchSnapshot();
});

test('uses workflow failure actions to invoke a child again with corrected inputs', async () => {
  const { result, logs } = await runContinuity(['workflow-failure-action']);

  expect(result.status).toBe(1);
  expect(result.stderr.match(/Invalid inputs for workflow "recoverable-child"/g)).toHaveLength(1);
  expect(requests.map((request) => request.path)).toEqual(['/orders', '/orders']);
  expect(JSON.parse(requests[1].body)).toEqual({
    customerName: 'Recovered Guest',
    orderItems: [{ menuItemId, quantity: 1 }],
  });
  expect(effects).toEqual([1, 2]);
  expect(logs.status).toBe('error');
  expect(result).toMatchSnapshot();
});

test('reports a circular dependency without starting its operation requests', async () => {
  const { result, logs } = await runContinuity(['circular-dependency', 'following']);

  expect(result.status).toBe(1);
  expect(result.stdout + result.stderr).toContain('Circular dependsOn dependency');
  expect(requests).toEqual([{ method: 'GET', path: '/menu', key: undefined, body: '' }]);
  expect(effects).toEqual([]);
  expect(logs.status).toBe('error');
  expect(result).toMatchSnapshot();
});

test('runs valid dependencies before the selected workflow with mapped inputs', async () => {
  const { result, logs } = await runWorkflow('with-dependency', {
    callerKey: 'dependency-key',
    customerName: 'Cafe Guest',
  });

  expect(result.status).toBe(0);
  expect(requests).toEqual([
    { method: 'GET', path: '/menu', key: undefined, body: '' },
    {
      method: 'POST',
      path: '/orders',
      key: 'dependency-key',
      body: JSON.stringify({
        customerName: 'Cafe Guest',
        orderItems: [{ menuItemId, quantity: 1 }],
      }),
    },
  ]);
  expect(effects).toEqual([1]);
  expect(logs.status).toBe('success');
  expect(result).toMatchSnapshot();
});

test('prepares and executes valid nested dependencies with their mapped inputs', async () => {
  const { result, logs } = await runContinuity(['valid-nested'], false, {
    customerName: 'Cafe Guest',
  });

  expect(result.status).toBe(0);
  expect(requests.map((request) => request.path)).toEqual(['/orders', '/orders', '/menu']);
  expect(JSON.parse(requests[1].body)).toEqual({
    customerName: 'Cafe Guest',
    orderItems: [{ menuItemId, quantity: 1 }],
  });
  expect(effects).toEqual([1, 2]);
  expect(logs.status).toBe('success');
  expect(result).toMatchSnapshot();
});

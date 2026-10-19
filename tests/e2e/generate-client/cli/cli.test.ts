import { generateClient } from '@redocly/client-generator';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyConsumer, expectTscPasses, runTsx } from '../helpers.js';
import { MockServer } from '../mock-server.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, 'cli.yaml');
let workDir = '';
let clientDir = '';
let stripDir = '';

let server: MockServer;

/** Run the generated CLI with tsx; returns exit code + parsed streams. */
async function runCliBin(args: string[], env: Record<string, string> = {}) {
  const result = await runTsx(join(clientDir, 'client.cli.ts'), [...args], {
    cwd: clientDir,
    env: { ...process.env, ...env },
  });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

describe('generate-client cli generator (end-to-end)', () => {
  beforeAll(async () => {
    server = await MockServer.start(fixture, {
      handlers: {
        // Two cursor pages: the first one points at `page-2`, which is the last.
        listOrders: ({ request }) => {
          if (request.query.cursor === 'page-2') {
            return { status: 200, body: { orders: [{ id: 'ord_2', item: 'tea', quantity: 1 }] } };
          }
          return {
            status: 200,
            body: {
              orders: [{ id: 'ord_1', item: 'espresso', quantity: 2 }],
              nextCursor: 'page-2',
            },
          };
        },
        // Echo the body back, so the test sees what the CLI forwarded.
        createOrder: ({ request }) => ({
          status: 201,
          body: { id: 'ord_new', ...JSON.parse(request.body?.toString('utf-8') ?? '{}') },
        }),
        getOrder: ({ request }) => ({
          status: 200,
          body: { id: request.path.split('/').pop(), item: 'espresso', quantity: 2 },
        }),
        ping: () => ({ status: 204 }),
      },
    });
    workDir = copyConsumer(join(__dirname, 'consumer'));
    clientDir = join(workDir, 'client');
    stripDir = join(workDir, 'client-strip');
    await generateClient({
      api: fixture,
      output: join(clientDir, 'client.ts'),
      generators: ['typescript', 'zod', 'cli'],
      serverUrl: server.url,
    });
    // A second copy with `.ts` specifiers: what a zero-build `node` runner needs.
    await generateClient({
      api: fixture,
      output: join(stripDir, 'client.ts'),
      generators: ['typescript', 'zod', 'cli'],
      importExt: 'ts',
      serverUrl: server.url,
    });
  }, 60_000);

  afterAll(async () => {
    await server.close();
    rmSync(workDir, { recursive: true, force: true });
  });

  it('--runtime module writes runtime/cli.ts and the entry runs through it', async () => {
    const moduleDir = join(workDir, 'client-module');
    await generateClient({
      api: fixture,
      output: join(moduleDir, 'client.ts'),
      generators: ['typescript', 'zod', 'cli'],
      runtime: 'module',
    });
    const entry = readFileSync(join(moduleDir, 'client.cli.ts'), 'utf-8');
    expect(entry).toContain('from "./runtime/cli.js"');
    expect(entry).not.toContain('function parseInvocation');
    expect(existsSync(join(moduleDir, 'runtime', 'cli.ts'))).toBe(true);
    const help = await runTsx(join(moduleDir, 'client.cli.ts'), ['--help'], { cwd: moduleDir });
    expect(help.status, help.stderr).toBe(0);
    expect(help.stdout).toContain('Usage:');
  });

  it('generates client.cli.ts and strict tsc (types: node) accepts it', () => {
    expect(existsSync(join(clientDir, 'client.cli.ts'))).toBe(true);
    expectTscPasses(['-p', clientDir]);
  }, 120_000);

  it('typed flags reach the query string; bearer auth comes from the env prefix', async () => {
    const before = server.requests.length;
    const { code, stdout } = await runCliBin(
      ['orders', 'listOrders', '--status', 'open', '--limit', '2'],
      { CLIENT_TOKEN: 'e2e-token' }
    );
    expect(code).toBe(0);
    expect(JSON.parse(stdout).orders).toHaveLength(1);
    const entries = server.requests;
    const hit = entries[entries.length - 1];
    expect(entries.length).toBe(before + 1);
    expect(hit.query).toMatchObject({ status: 'open', limit: '2' });
    expect(hit.headers.authorization).toBe('Bearer e2e-token');
  });

  it('positional path params and --json bodies dispatch correctly', async () => {
    const get = await runCliBin(['orders', 'getOrder', 'ord_42']);
    expect(get.code).toBe(0);
    expect(JSON.parse(get.stdout).id).toBe('ord_42');

    const create = await runCliBin(['orders', 'createOrder', '--json', '@order.json']);
    expect(create.code).toBe(0);
    expect(JSON.parse(create.stdout)).toMatchObject({ id: 'ord_new', item: 'latte' });
    const entries = server.requests;
    expect(entries[entries.length - 1].body?.toString('utf-8')).toBe(
      '{"item":"latte","quantity":1}'
    );
  });

  it('zod validation failures exit 3 without hitting the server', async () => {
    const before = server.requests.length;
    const { code, stderr } = await runCliBin([
      'orders',
      'createOrder',
      '--json',
      '{"item":"latte","quantity":0}',
    ]);
    expect(code).toBe(3);
    expect(JSON.parse(stderr).error.code).toBe(3);
    expect(server.requests.length).toBe(before);
  });

  it('--dry-run prints the prepared request and sends nothing; the token is redacted', async () => {
    const before = server.requests.length;
    const { code, stdout } = await runCliBin(['orders', 'getOrder', 'ord_1', '--dry-run'], {
      CLIENT_TOKEN: 'secret-token',
    });
    expect(code).toBe(0);
    const captured = JSON.parse(stdout);
    expect(captured.url).toContain('/orders/ord_1');
    expect(captured.method).toBe('GET');
    expect(JSON.stringify(captured)).not.toContain('secret-token');
    expect(server.requests.length).toBe(before);
  });

  it('--page-all follows the cursor and prints one JSON page per line', async () => {
    const { code, stdout } = await runCliBin(['orders', 'listOrders', '--page-all']);
    expect(code).toBe(0);
    const pages = stdout
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    expect(pages).toHaveLength(2);
    expect(pages[0].orders[0].id).toBe('ord_1');
    expect(pages[1].orders[0].id).toBe('ord_2');
    expect(server.handlerErrors).toEqual([]);
  });

  it('schema prints the request schema; usage errors exit 4; --help exits 0', async () => {
    const schema = await runCliBin(['schema', 'createOrder']);
    expect(schema.code).toBe(0);
    expect(JSON.parse(schema.stdout).request).toBeDefined();

    const usage = await runCliBin(['orders', 'listOrders', '--bogus', 'x']);
    expect(usage.code).toBe(4);
    expect(JSON.parse(usage.stderr).error.code).toBe(4);

    const help = await runCliBin(['--help']);
    expect(help.code).toBe(0);
    expect(help.stdout).toContain('orders');
  });

  it('runs under node type stripping with no build step, zod included', () => {
    // Erasable TypeScript only: a constructor parameter property anywhere in the import
    // graph (it was in the zod module's error class) breaks strip-only mode.
    const result = spawnSync(
      process.execPath,
      ['--experimental-strip-types', join(stripDir, 'client.cli.ts'), '--help'],
      { encoding: 'utf-8', cwd: workDir }
    );
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(result.stdout).toContain('Usage:');
  });

  it('void results print nothing and exit 0', async () => {
    const { code, stdout } = await runCliBin(['ping']);
    expect(code).toBe(0);
    expect(stdout.trim()).toBe('');
  });
});

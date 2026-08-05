import { spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generate, killServer, startServer, tsxBin } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, 'fixtures/cli.yaml');
const consumerDir = join(__dirname, 'cli-consumer');
const clientDir = join(consumerDir, 'client');
const stripDir = join(consumerDir, 'client-strip');

const SERVER_PORT = 3108;
const SERVER_BASE = `http://127.0.0.1:${SERVER_PORT}`;

// Every case below spawns the generated CLI through `tsx` (often several times), and
// TypeScript startup alone can approach the 5s default on a loaded machine.
vi.setConfig({ testTimeout: 120_000 });

/** Run the generated CLI with tsx; returns exit code + parsed streams. */
function runCliBin(args: string[], env: Record<string, string> = {}) {
  const result = spawnSync(tsxBin, [join(clientDir, 'client.cli.ts'), ...args], {
    cwd: clientDir,
    encoding: 'utf-8',
    env: { ...process.env, ...env },
  });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

async function serverLog(): Promise<
  Array<{ method: string; url: string; authorization?: string; body?: string }>
> {
  const response = await fetch(`${SERVER_BASE}/__test__/log`);
  return response.json();
}

describe('generate-client cli generator (end-to-end)', () => {
  let serverProcess: ChildProcess | undefined;

  beforeAll(async () => {
    generate(fixture, join(clientDir, 'client.ts'), [
      '--generator',
      'sdk',
      '--generator',
      'zod',
      '--generator',
      'cli',
    ]);
    writeFileSync(join(clientDir, 'package.json'), JSON.stringify({ type: 'module' }), 'utf-8');
    // A second copy with `.ts` specifiers: what a zero-build `node` runner needs.
    generate(fixture, join(stripDir, 'client.ts'), [
      '--generator',
      'sdk',
      '--generator',
      'zod',
      '--generator',
      'cli',
      '--import-ext',
      'ts',
    ]);
    writeFileSync(join(stripDir, 'package.json'), JSON.stringify({ type: 'module' }), 'utf-8');
    serverProcess = await startServer(
      join(consumerDir, 'server.ts'),
      consumerDir,
      { CLI_SERVER_PORT: String(SERVER_PORT) },
      SERVER_BASE,
      'cli-e2e-server'
    );
  }, 60_000);

  afterAll(async () => {
    if (serverProcess) await killServer(serverProcess);
    rmSync(clientDir, { recursive: true, force: true });
    rmSync(stripDir, { recursive: true, force: true });
  });

  it('generates client.cli.ts and strict tsc (types: node) accepts it', () => {
    expect(existsSync(join(clientDir, 'client.cli.ts'))).toBe(true);
    writeFileSync(
      join(clientDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          module: 'nodenext',
          moduleResolution: 'nodenext',
          target: 'es2022',
          lib: ['ES2022', 'DOM'],
          strict: true,
          noEmit: true,
          skipLibCheck: true,
          types: ['node'],
        },
        include: ['**/*.ts'],
      }),
      'utf-8'
    );
    const tsc = spawnSync(join(__dirname, '../../../node_modules/.bin/tsc'), ['-p', clientDir], {
      encoding: 'utf-8',
    });
    expect(tsc.status, `${tsc.stdout}\n${tsc.stderr}`).toBe(0);
  }, 120_000);

  it('typed flags reach the query string; bearer auth comes from the env prefix', async () => {
    const before = (await serverLog()).length;
    const { code, stdout } = runCliBin(
      ['orders', 'listOrders', '--status', 'open', '--limit', '2'],
      { CLIENT_TOKEN: 'e2e-token' }
    );
    expect(code).toBe(0);
    expect(JSON.parse(stdout).orders).toHaveLength(1);
    const entries = await serverLog();
    const hit = entries[entries.length - 1];
    expect(entries.length).toBe(before + 1);
    expect(hit.url).toContain('status=open');
    expect(hit.url).toContain('limit=2');
    expect(hit.authorization).toBe('Bearer e2e-token');
  });

  it('positional path params and --json bodies dispatch correctly', async () => {
    const get = runCliBin(['orders', 'getOrder', 'ord_42']);
    expect(get.code).toBe(0);
    expect(JSON.parse(get.stdout).id).toBe('ord_42');

    writeFileSync(join(clientDir, 'order.json'), '{"item":"latte","quantity":1}', 'utf-8');
    const create = runCliBin(['orders', 'createOrder', '--json', '@order.json']);
    expect(create.code).toBe(0);
    expect(JSON.parse(create.stdout)).toMatchObject({ id: 'ord_new', item: 'latte' });
    const entries = await serverLog();
    expect(entries[entries.length - 1].body).toBe('{"item":"latte","quantity":1}');
  });

  it('zod validation failures exit 3 without hitting the server', async () => {
    const before = (await serverLog()).length;
    const { code, stderr } = runCliBin([
      'orders',
      'createOrder',
      '--json',
      '{"item":"latte","quantity":0}',
    ]);
    expect(code).toBe(3);
    expect(JSON.parse(stderr).error.code).toBe(3);
    expect((await serverLog()).length).toBe(before);
  });

  it('--dry-run prints the prepared request and sends nothing; the token is redacted', async () => {
    const before = (await serverLog()).length;
    const { code, stdout } = runCliBin(['orders', 'getOrder', 'ord_1', '--dry-run'], {
      CLIENT_TOKEN: 'secret-token',
    });
    expect(code).toBe(0);
    const captured = JSON.parse(stdout);
    expect(captured.url).toContain('/orders/ord_1');
    expect(captured.method).toBe('GET');
    expect(JSON.stringify(captured)).not.toContain('secret-token');
    expect((await serverLog()).length).toBe(before);
  });

  it('--page-all follows the cursor and prints one JSON page per line', () => {
    const { code, stdout } = runCliBin(['orders', 'listOrders', '--page-all']);
    expect(code).toBe(0);
    const pages = stdout
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
    expect(pages).toHaveLength(2);
    expect(pages[0].orders[0].id).toBe('ord_1');
    expect(pages[1].orders[0].id).toBe('ord_2');
  });

  it('schema prints the request schema; usage errors exit 4; --help exits 0', () => {
    const schema = runCliBin(['schema', 'createOrder']);
    expect(schema.code).toBe(0);
    expect(JSON.parse(schema.stdout).request).toBeDefined();

    const usage = runCliBin(['orders', 'listOrders', '--bogus', 'x']);
    expect(usage.code).toBe(4);
    expect(JSON.parse(usage.stderr).error.code).toBe(4);

    const help = runCliBin(['--help']);
    expect(help.code).toBe(0);
    expect(help.stdout).toContain('orders');
  });

  it('runs under node type stripping with no build step, zod included', () => {
    // Erasable TypeScript only: a constructor parameter property anywhere in the import
    // graph (it was in the zod module's error class) breaks strip-only mode.
    const result = spawnSync(
      process.execPath,
      ['--experimental-strip-types', join(stripDir, 'client.cli.ts'), '--help'],
      { encoding: 'utf-8', cwd: consumerDir }
    );
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(result.stdout).toContain('Usage:');
  });

  it('void results print nothing and exit 0', () => {
    const { code, stdout } = runCliBin(['ping']);
    expect(code).toBe(0);
    expect(stdout.trim()).toBe('');
  });
});

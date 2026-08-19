import { spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cliEntry, generate, killServer, startServer } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, 'fixtures/base.yaml');
const consumerDir = join(__dirname, 'python-consumer');
const generatedFile = join(consumerDir, 'client.py');

const SERVER_PORT = 3106;
const SERVER_BASE = `http://127.0.0.1:${SERVER_PORT}`;

const hasPython = spawnSync('python3', ['--version']).status === 0;
const hasHttpx = hasPython && spawnSync('python3', ['-c', 'import httpx']).status === 0;
const hasPydantic = hasPython && spawnSync('python3', ['-c', 'import pydantic']).status === 0;

describe('generate-client python generator (end-to-end)', () => {
  afterAll(() => {
    rmSync(generatedFile, { force: true });
    rmSync(join(consumerDir, '__pycache__'), { recursive: true, force: true });
  });

  it('generates a self-contained client.py from the CLI', () => {
    generate(fixture, join(consumerDir, 'client.ts'), ['--generator', 'python']);
    expect(existsSync(generatedFile)).toBe(true);
  });

  it.skipIf(!hasPython)('the generated client is valid Python', () => {
    const result = spawnSync('python3', ['-m', 'py_compile', generatedFile], {
      encoding: 'utf-8',
    });
    expect(result.status, result.stderr).toBe(0);
  });

  it.skipIf(!hasHttpx)(
    'runs real HTTP against the mock server: hydration, bodies, ApiError',
    async () => {
      let serverProcess: ChildProcess | undefined;
      try {
        serverProcess = await startServer(
          join(__dirname, 'base-consumer/server.ts'),
          join(__dirname, 'base-consumer'),
          { BASE_SERVER_PORT: String(SERVER_PORT) },
          SERVER_BASE,
          'python-smoke-server'
        );
        const result = spawnSync(
          'python3',
          [join(consumerDir, 'smoke.py'), generatedFile, SERVER_BASE],
          { encoding: 'utf-8' }
        );
        expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
        expect(result.stdout).toContain('PYTHON_SMOKE_OK');
      } finally {
        if (serverProcess) await killServer(serverProcess);
      }
    },
    60_000
  );
});

describe('generate-client python generator, models: pydantic (end-to-end)', () => {
  // `models` is config-only, like every per-generator option, so this drives a config file.
  let dir: string;
  let generated: string;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'python-pydantic-'));
    writeFileSync(
      join(dir, 'redocly.yaml'),
      [
        'apis:',
        '  cafe:',
        `    root: ${join(__dirname, 'fixtures/cafe.yaml')}`,
        '    clientOutput: ./client.ts',
        '    client:',
        '      generators: [python]',
        '      options:',
        '        python:',
        '          models: pydantic',
      ].join('\n'),
      'utf-8'
    );
    const result = spawnSync('node', [cliEntry, 'generate-client'], {
      cwd: dir,
      encoding: 'utf-8',
    });
    expect(result.status, result.stderr).toBe(0);
    generated = join(dir, 'client.py');
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('emits BaseModel classes and names pydantic in the header', () => {
    const source = readFileSync(generated, 'utf-8');
    expect(source).toContain('pip install httpx pydantic');
    expect(source).toContain('from pydantic import BaseModel, ConfigDict, Field');
    expect(source).toContain('(BaseModel):');
    // The client and the runtime are the same in both model modes.
    expect(source).toContain('class Client:');
    expect(source).toContain('def decode(');
  });

  it.skipIf(!hasPython)('the generated client is valid Python', () => {
    const result = spawnSync('python3', ['-m', 'py_compile', generated], { encoding: 'utf-8' });
    expect(result.status, result.stderr).toBe(0);
  });

  it.skipIf(!hasPydantic)('decodes wire names through aliases and encodes them back', () => {
    // One round trip proves the three pieces of this mode: the alias, the runtime
    // dispatch to pydantic, and `by_alias` on the way out.
    const script = [
      'import json, sys',
      `sys.path.insert(0, ${JSON.stringify(dir)})`,
      'import client',
      'wire = {"customerName": "Sam", "orderItems": [], "id": "ord_1", "totalPrice": 900}',
      'order = client.decode(client.Order, wire)',
      'assert type(order).__name__ == "Order", type(order)',
      // The wire name arrives on the aliased field, and leaves on the alias again.
      'assert order.customer_name == "Sam", order',
      'assert order.total_price == 900, order',
      'assert client.encode(order) == wire, client.encode(order)',
      // A required field missing must fail loudly: that is what this mode buys.
      'import pydantic',
      'try:',
      '    client.decode(client.Order, {"id": "ord_1"})',
      '    raise AssertionError("expected a validation error")',
      'except pydantic.ValidationError:',
      '    pass',
      'print("PYDANTIC_ROUND_TRIP_OK")',
    ].join('\n');
    const result = spawnSync('python3', ['-c', script], { encoding: 'utf-8' });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    expect(result.stdout).toContain('PYDANTIC_ROUND_TRIP_OK');
  });

  it.skipIf(!hasPydantic)('resolves a discriminated union nested in a model, not by shape', () => {
    // Pydantic resolves a nested union itself, so the discriminator has to reach the
    // annotation: `MenuItem` lives inside `MenuItemList.items`, never at the top level.
    const item = [
      '{"category": "dessert", "calories": 400, "id": "mi_1", "name": "Cake",',
      '"price": 500, "createdAt": "2026-01-01T00:00:00Z",',
      '"updatedAt": "2026-01-01T00:00:00Z", "object": "menuItem"}',
    ].join(' ');
    const script = [
      'import sys',
      `sys.path.insert(0, ${JSON.stringify(dir)})`,
      'import client',
      `item = ${item}`,
      'page = {"limit": 1, "endCursor": "c", "startCursor": "c",',
      '        "hasNextPage": False, "hasPrevPage": False, "total": 1}',
      'listed = client.decode(client.MenuItemList, {"object": "list", "page": page, "items": [item]})',
      'assert type(listed.items[0]).__name__ == "Dessert", type(listed.items[0])',
      // The top level goes through the same annotation.
      'assert type(client.decode(client.MenuItem, item)).__name__ == "Dessert"',
      'assert client.encode(listed)["items"][0]["category"] == "dessert"',
      'print("PYDANTIC_DISCRIMINATOR_OK")',
    ].join('\n');
    const result = spawnSync('python3', ['-c', script], { encoding: 'utf-8' });
    expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
    expect(result.stdout).toContain('PYDANTIC_DISCRIMINATOR_OK');
  });
});

describe('generate-client python generator, parameter names an SDK cannot take literally', () => {
  let dir: string;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'python-repeated-'));
    generate(join(__dirname, 'fixtures/repeated-params.yaml'), join(dir, 'client.ts'), [
      '--generator',
      'python',
    ]);
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('renames the repeat, keeps the wire name, and still parses', () => {
    const source = readFileSync(join(dir, 'client.py'), 'utf-8');
    // `id` in the path and in the query: the later one moves aside…
    expect(source).toContain('def get_thing(self, id: str, *, id_2: Optional[int] = None');
    // …and a parameter named after one of the method's own arguments does too.
    expect(source).toContain('def make_thing(self, body_2: str, ctx: str, body: Thing, *,');
    expect(source).toContain('timeout_2: Optional[str] = None');
    // The request is unchanged: the descriptor and the query keys keep the wire names.
    expect(source).toContain('params["id"] = encode(id_2)');
    expect(source).toContain('params["timeout"] = encode(timeout_2)');
  });

  it.skipIf(!hasPython)('the generated client is valid Python', () => {
    const result = spawnSync('python3', ['-m', 'py_compile', join(dir, 'client.py')], {
      encoding: 'utf-8',
    });
    expect(result.status, result.stderr).toBe(0);
  });
});

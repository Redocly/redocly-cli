import { generateClient } from '@redocly/client-generator';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runCommand } from '../helpers/helpers.js';
import { MockServer } from '../helpers/mock-server.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, '../fixtures/base.yaml');
const smokeScript = join(__dirname, 'consumer/smoke.py');
let workDir = '';
let generatedFile = '';

describe('generate-client python generator (end-to-end)', () => {
  beforeAll(async () => {
    workDir = mkdtempSync(join(tmpdir(), 'python-e2e-'));
    generatedFile = join(workDir, 'client.py');
    await generateClient({
      api: fixture,
      output: join(workDir, 'client.ts'),
      generators: ['python'],
    });
    expect(existsSync(generatedFile)).toBe(true);
  });

  afterAll(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  it('the generated client is valid Python', () => {
    const result = spawnSync('python3', ['-m', 'py_compile', generatedFile], {
      encoding: 'utf-8',
    });
    expect(result.status, result.stderr).toBe(0);
  });

  it('runs real HTTP against the mock server: hydration, bodies, ApiError', async () => {
    const server = await MockServer.start(fixture);
    try {
      const result = await runCommand('python3', [smokeScript, generatedFile, server.url]);
      expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
      expect(result.stdout).toContain('PYTHON_SMOKE_OK');
      expect(server.handlerErrors).toEqual([]);
    } finally {
      await server.close();
    }
  }, 60_000);
});

describe('generate-client python generator, models: pydantic (end-to-end)', () => {
  // `models` is a per-generator option; the API takes it in `options`, as redocly.yaml does.
  let dir: string;
  let generated: string;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'python-pydantic-'));
    await generateClient({
      api: join(__dirname, '../fixtures/cafe.yaml'),
      output: join(dir, 'client.ts'),
      generators: ['python'],
      options: { python: { models: 'pydantic' } },
    });
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

  it('the generated client is valid Python', () => {
    const result = spawnSync('python3', ['-m', 'py_compile', generated], { encoding: 'utf-8' });
    expect(result.status, result.stderr).toBe(0);
  });

  it('decodes wire names through aliases and encodes them back', () => {
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

  it('resolves a discriminated union nested in a model, not by shape', () => {
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

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'python-repeated-'));
    await generateClient({
      api: join(__dirname, '../fixtures/repeated-params.yaml'),
      output: join(dir, 'client.ts'),
      generators: ['python'],
    });
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

  it('the generated client is valid Python', () => {
    const result = spawnSync('python3', ['-m', 'py_compile', join(dir, 'client.py')], {
      encoding: 'utf-8',
    });
    expect(result.status, result.stderr).toBe(0);
  });
});

describe('generate-client python generator, a paginated operation under a path parameter', () => {
  let dir: string;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'python-page-path-'));
    await generateClient({
      api: join(__dirname, 'openapi.yaml'),
      output: join(dir, 'client.ts'),
      generators: ['python'],
    });
  });

  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('substitutes the path value into every page request', async () => {
    // The page server: what matters is the URL the iterator asks for, which used to be the
    // template itself (`/orders/{orderId}/items`) with the value dropped.
    const server = await MockServer.start(join(__dirname, 'openapi.yaml'), {
      handlers: {
        listOrderItems: ({ request }) => ({
          status: 200,
          body: { items: [{ id: 'i1' }], next: request.query.cursor === undefined ? 'c2' : null },
        }),
      },
    });
    try {
      const script = [
        'import sys',
        `sys.path.insert(0, ${JSON.stringify(dir)})`,
        'import client',
        `pages = list(client.Client(server_url=${JSON.stringify(server.url)}).list_order_items_pages("ord_7"))`,
        'assert len(pages) == 2, pages',
        'print("PYTHON_PAGE_PATH_OK")',
      ].join('\n');
      const result = await runCommand('python3', ['-c', script]);
      expect(result.status, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
      expect(result.stdout).toContain('PYTHON_PAGE_PATH_OK');
      expect(server.requests.map((request) => request.url)).toEqual([
        '/orders/ord_7/items',
        '/orders/ord_7/items?cursor=c2',
      ]);
      expect(server.handlerErrors).toEqual([]);
    } finally {
      await server.close();
    }
  });
});

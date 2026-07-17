import { spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { cliEntry, killServer, repoRoot, startServer } from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, 'fixtures/cafe.yaml');
const consumerDir = join(__dirname, 'cafe-consumer');
const generatedFile = join(consumerDir, 'api.ts');
const serverScript = join(consumerDir, 'server.ts');
const indexScript = join(consumerDir, 'index.ts');
const configureScript = join(consumerDir, 'index-configure.ts');

const SERVER_PORT = 3101;
const SERVER_BASE = `http://127.0.0.1:${SERVER_PORT}`;

type LogEntry = {
  method: string;
  url: string;
  contentType: string | undefined;
  body: string;
  headers: Record<string, string>;
};
type StepResult =
  | { kind: 'ok'; name: string; data: unknown }
  | { kind: 'err'; name: string; error: string };

const snapshotFile = join(__dirname, 'cafe.snapshot.ts');

describe('generate-client end-to-end (cafe.yaml)', () => {
  let serverProcess: ChildProcess | undefined;
  let results: StepResult[] = [];
  let log: LogEntry[] = [];
  /** Raw generator output — what the CLI emits from cafe.yaml without any overrides. */
  let rawGenerated = '';
  /** Generator output the consumer imports — same source, but serverUrl pinned at the mock via --server-url. */
  let generated = '';

  beforeAll(async () => {
    if (existsSync(generatedFile)) {
      rmSync(generatedFile, { force: true });
    }

    serverProcess = await startServer(
      serverScript,
      consumerDir,
      { CAFE_SERVER_PORT: String(SERVER_PORT) },
      SERVER_BASE,
      'cafe-server'
    );

    // First pass: capture the *canonical* output (spec-derived serverUrl) for the file snapshot.
    // We don't keep this on disk — the consumer needs the mock-targeted variant.
    const snapshotGen = spawnSync(
      'node',
      [cliEntry, 'generate-client', fixture, '--output', generatedFile],
      { encoding: 'utf-8', cwd: repoRoot }
    );
    if (snapshotGen.status !== 0) {
      throw new Error(`generate-client (snapshot pass) failed:\n${snapshotGen.stderr}`);
    }
    rawGenerated = readFileSync(generatedFile, 'utf-8');

    // Second pass: regenerate with --server-url so the consumer's import targets the mock.
    // This is the file the consumer actually loads — and replaces the old string-replace hack.
    const consumerGen = spawnSync(
      'node',
      [
        cliEntry,
        'generate-client',
        fixture,
        '--output',
        generatedFile,
        '--server-url',
        SERVER_BASE,
      ],
      { encoding: 'utf-8', cwd: repoRoot }
    );
    if (consumerGen.status !== 0) {
      throw new Error(`generate-client (consumer pass) failed:\n${consumerGen.stderr}`);
    }
    generated = readFileSync(generatedFile, 'utf-8');
    if (!generated.includes(`{ serverUrl: "${SERVER_BASE}" }`)) {
      throw new Error(
        `--server-url was not honoured; expected \`{ serverUrl: "${SERVER_BASE}" }\``
      );
    }

    // Type-check the consumer.
    const tsc = spawnSync('npx', ['tsc', '--noEmit', '-p', consumerDir], {
      encoding: 'utf-8',
      cwd: repoRoot,
    });
    if (tsc.status !== 0) {
      throw new Error(`tsc --noEmit failed:\nstdout:\n${tsc.stdout}\nstderr:\n${tsc.stderr}`);
    }

    // Run consumer.
    const run = spawnSync('npx', ['tsx', indexScript], {
      encoding: 'utf-8',
      cwd: consumerDir,
      env: { ...process.env, CAFE_BASE: SERVER_BASE },
    });
    if (run.status !== 0) {
      throw new Error(`consumer failed:\nstdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    }
    results = JSON.parse(run.stdout.trim()) as StepResult[];

    const logResponse = await fetch(`${SERVER_BASE}/__test__/log`);
    log = (await logResponse.json()) as LogEntry[];
  }, 120_000);

  afterAll(async () => {
    if (serverProcess) await killServer(serverProcess);
  });

  test('generated file matches the committed snapshot (cafe.snapshot.ts)', async () => {
    // Full-file guard against accidental emitter regressions. The PR diff against this
    // snapshot is the single most informative signal when the IR builder or emitter changes.
    // After an intentional emitter change, regenerate with: `npm run e2e -- -u`.
    await expect(rawGenerated).toMatchFileSnapshot(snapshotFile);
  });

  test('generated file contains expected named types', () => {
    expect(generated).toContain('export type MenuItem = Beverage | Dessert;');
    expect(generated).toContain('export type Beverage = {');
    expect(generated).toContain('} & MenuBaseItem;');
    expect(generated).toContain(
      'export type OrderStatus = "placed" | "preparing" | "completed" | "canceled";'
    );
    expect(generated).toContain('export type MenuItemList = {');
    expect(generated).toContain('export type OrderList = {');
    expect(generated).toContain('export type RevenueStatistics = {');
    expect(generated).toContain('export type OAuth2Client = {');
  });

  test('generated file declares one flat call-sugar function per operation', () => {
    const expected = [
      'listMenuItems',
      'createMenuItem',
      'deleteMenuItem',
      'getMenuItemPhoto',
      'listOrders',
      'createOrder',
      'getOrderById',
      'updateOrder',
      'deleteOrder',
      'listOrderItems',
      'getRevenue',
      'registerOAuth2Client',
    ];
    for (const name of expected) {
      expect(generated).toContain(`export const ${name} = (`);
    }
  });

  test('exports an OPERATIONS descriptor map keyed by operationId (method + path template)', () => {
    expect(generated).toContain('export const OPERATIONS = {');
    expect(generated).toContain('} as const satisfies Record<string, OperationDescriptor>;');
    expect(generated).toContain('export type OperationId = keyof typeof OPERATIONS;');
    // A path-param operation keeps its `{param}` template, uppercased method, and tags.
    expect(generated).toContain(
      'getOrderById: { id: "getOrderById", method: "GET", path: "/orders/{orderId}", tags: ["Orders"]'
    );
    expect(generated).toContain(
      'updateOrder: { id: "updateOrder", method: "PATCH", path: "/orders/{orderId}", tags: ["Orders"]'
    );
    expect(generated).toContain(
      'createOrder: { id: "createOrder", method: "POST", path: "/orders", tags: ["Orders"]'
    );
    // The typed instance client is built over the descriptors.
    expect(generated).toContain(
      'export const client = createClient<Ops, OperationId, OperationPath, OperationTag>(OPERATIONS,'
    );
    expect(generated).toContain('export const { configure, use } = client;');
  });

  test('generated file uses ergonomic signatures (positional path params + params object + body)', () => {
    expect(generated).toContain('export const deleteMenuItem = (menuItemId: string,');
    expect(generated).toContain('export const getMenuItemPhoto = (menuItemId: string,');
    expect(generated).toContain('export const updateOrder = (orderId: string,');
    expect(generated).toContain('export const listMenuItems = (params:');
    // readOnly fields are dropped from the create body (Bucket C).
    expect(generated).toContain(
      'export const createOrder = (body: Omit<Order, "id" | "object" | "status" | "totalPrice" | "createdAt" | "updatedAt">,'
    );
    expect(generated).toContain('export const createMenuItem = (body: FormData,');
  });

  // Named string enums get a runtime const-object companion by default, which the
  // consumer uses (`OrderStatus.completed`) when updating an order.
  test('emits a const-object companion for the OrderStatus string enum', () => {
    expect(generated).toContain('export type OrderStatus =');
    expect(generated).toContain('export const OrderStatus = {');
    expect(generated).toContain('  completed: "completed",');
    expect(generated).toContain('} as const;');
  });

  test('every consumer step succeeds', () => {
    const failures = results.filter((r) => r.kind === 'err');
    expect(failures, JSON.stringify(failures, null, 2)).toEqual([]);
  });

  test('listMenuItems serialises the query string with after/limit/sort/search', () => {
    const entry = log.find((e) => e.method === 'GET' && e.url.startsWith('/menu?'));
    expect(entry).toBeDefined();
    expect(entry!.url).toContain('after=cursor1');
    expect(entry!.url).toContain('limit=5');
    expect(entry!.url).toContain('sort=-name');
    expect(entry!.url).toContain('search=coffee');
  });

  test('createMenuItem POSTs multipart/form-data with the provided FormData', () => {
    const entry = log.find((e) => e.method === 'POST' && e.url === '/menu');
    expect(entry).toBeDefined();
    expect(entry!.contentType).toMatch(/^multipart\/form-data; boundary=/);
    expect(entry!.body).toContain('name="name"');
    expect(entry!.body).toContain('Latte');
  });

  test('deleteMenuItem sends DELETE on the path-templated URL', () => {
    const entry = log.find(
      (e) => e.method === 'DELETE' && e.url === '/menu/prd_01h1s5z6vf2mm1mz3hevnn9va7'
    );
    expect(entry).toBeDefined();
  });

  test('getMenuItemPhoto reads a binary response as Blob', () => {
    const photoStep = results.find((r) => r.name === 'getMenuItemPhoto');
    expect(photoStep?.kind).toBe('ok');
    if (photoStep?.kind === 'ok') {
      // The mock server generates the body from the OpenAPI spec. The exact size
      // and MIME depend on sampler internals (mock-server's supported-media-type
      // allowlist may pick text/plain over image/png), so we assert only on the
      // contract that matters here: the binary path returns a non-empty Blob.
      const data = photoStep.data as {
        kind: string;
        size: number;
        type: string;
      };
      expect(data.kind).toBe('blob');
      expect(data.size).toBeGreaterThan(0);
    }
  });

  test('createOrder POSTs JSON body with Content-Type: application/json', () => {
    const entry = log.find((e) => e.method === 'POST' && e.url === '/orders');
    expect(entry).toBeDefined();
    expect(entry!.contentType).toMatch(/^application\/json/);
    const parsed = JSON.parse(entry!.body) as { customerName: string };
    expect(parsed.customerName).toBe('Ada Lovelace');
  });

  test('updateOrder PATCHes the URL and forwards the JSON body', () => {
    const entry = log.find(
      (e) => e.method === 'PATCH' && e.url === '/orders/ord_01h1s5z6vf2mm1mz3hevnn9va7'
    );
    expect(entry).toBeDefined();
    const parsed = JSON.parse(entry!.body) as { status: string };
    expect(parsed.status).toBe('completed');
  });

  // getOrderById declares an optional `X-Request-Id` header param; the consumer
  // supplies it, and it must reach the server as a real request header.
  test('getOrderById sends the X-Request-Id operation header parameter', () => {
    const entry = log.find(
      (e) => e.method === 'GET' && e.url === '/orders/ord_01h1s5z6vf2mm1mz3hevnn9va7'
    );
    expect(entry).toBeDefined();
    expect(entry!.headers['x-request-id']).toBe('11111111-2222-3333-4444-555555555555');
  });

  // The consumer calls setBearer()/setApiKey() once; every OAuth2 operation must
  // then carry the bearer header, every ApiKey operation the X-API-Key header,
  // and `security: []` operations neither.
  test('setBearer() injects Authorization on OAuth2 operations (getOrderById)', () => {
    const entry = log.find(
      (e) => e.method === 'GET' && e.url === '/orders/ord_01h1s5z6vf2mm1mz3hevnn9va7'
    );
    expect(entry).toBeDefined();
    expect(entry!.headers['authorization']).toBe('Bearer test-bearer-token');
  });

  test('setApiKey() injects X-API-Key on ApiKey operations (getRevenue)', () => {
    const entry = log.find((e) => e.method === 'GET' && e.url.startsWith('/revenue'));
    expect(entry).toBeDefined();
    expect(entry!.headers['x-api-key']).toBe('test-api-key');
  });

  test('operations declared security: [] send no credentials (listMenuItems)', () => {
    const entry = log.find((e) => e.method === 'GET' && e.url.startsWith('/menu?'));
    expect(entry).toBeDefined();
    expect(entry!.headers['authorization']).toBeUndefined();
    expect(entry!.headers['x-api-key']).toBeUndefined();
  });

  // The discriminated-union type guards must agree with the raw `category`
  // discriminant and be mutually exclusive.
  test('isBeverage/isDessert narrow a MenuItem from the server response', () => {
    const step = results.find((r) => r.name === 'menuItemGuards');
    expect(step?.kind).toBe('ok');
    if (step?.kind === 'ok') {
      const data = step.data as {
        category: string;
        isBeverage: boolean;
        isDessert: boolean;
        agree: boolean;
        exclusive: boolean;
      };
      expect(data.agree).toBe(true);
      expect(data.exclusive).toBe(true);
    }
  });

  test('204 No Content paths return void (deleteOrder)', () => {
    const step = results.find((r) => r.name === 'deleteOrder');
    expect(step?.kind).toBe('ok');
    if (step?.kind === 'ok') expect(step.data).toBeUndefined();
  });

  test('listOrderItems serialises query filter and returns an array', () => {
    const entry = log.find((e) => e.method === 'GET' && e.url.startsWith('/order-items'));
    expect(entry).toBeDefined();
    expect(entry!.url).toContain('filter=orderId%3Aord_01h1s5z6vf2mm1mz3hevnn9va7');
    const step = results.find((r) => r.name === 'listOrderItems');
    expect(step?.kind).toBe('ok');
    if (step?.kind === 'ok') expect(Array.isArray(step.data)).toBe(true);
  });

  test('getRevenue serialises ISO date strings as query params', () => {
    const entry = log.find((e) => e.method === 'GET' && e.url.startsWith('/revenue?'));
    expect(entry).toBeDefined();
    expect(entry!.url).toContain('startDate=2026-01-01');
    expect(entry!.url).toContain('endDate=2026-01-31');
  });

  test('registerOAuth2Client posts JSON arrays correctly', () => {
    const entry = log.find((e) => e.method === 'POST' && e.url === '/oauth2/register');
    expect(entry).toBeDefined();
    const parsed = JSON.parse(entry!.body) as {
      scopes: string[];
      grantTypes: string[];
      name: string;
    };
    expect(parsed.name).toBe('demo-client');
    expect(parsed.scopes).toEqual(['menu:read', 'orders:read']);
    expect(parsed.grantTypes).toEqual(['client_credentials']);
  });

  test('ApiError is thrown for non-2xx responses with parsed JSON body', () => {
    const step = results.find((r) => r.name === 'error-path');
    expect(step?.kind).toBe('ok');
    if (step?.kind === 'ok') {
      expect(step.data).toEqual({
        apiError: true,
        status: 500,
        statusText: 'Internal Server Error',
      });
    }
  });

  // `configure({ serverUrl })` is exercised mid-flight: the first call hits the mock,
  // the second (after flipping to an unreachable host) fails to connect, and the
  // third (after restoring) succeeds again.
  test('configure({ serverUrl }) switches the base URL for subsequent operations', () => {
    const run = spawnSync('npx', ['tsx', configureScript], {
      encoding: 'utf-8',
      cwd: consumerDir,
      env: { ...process.env, CAFE_BASE: SERVER_BASE },
    });
    expect(run.status, `configure consumer stderr:\n${run.stderr}`).toBe(0);
    const steps = JSON.parse(run.stdout.trim()) as Array<
      { kind: 'ok'; name: string } | { kind: 'err'; name: string; error: string }
    >;
    expect(steps.find((s) => s.name === 'initial-call-against-mock')?.kind).toBe('ok');
    const flipped = steps.find((s) => s.name === 'call-after-configure-to-unreachable');
    expect(flipped?.kind).toBe('err');
    expect(steps.find((s) => s.name === 'call-after-configure-restored')?.kind).toBe('ok');
  });
});

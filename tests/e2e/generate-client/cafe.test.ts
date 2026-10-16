import { type ChildProcess } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  copyConsumer,
  expectTscPasses,
  killServer,
  runGenerateClient,
  runTsx,
  serverLog,
  startServer,
} from './helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, 'fixtures/cafe.yaml');

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
  let workDir = '';

  beforeAll(async () => {
    workDir = copyConsumer('cafe-consumer');
    const generatedFile = join(workDir, 'api.ts');

    serverProcess = await startServer(
      'cafe',
      { CAFE_SERVER_PORT: String(SERVER_PORT) },
      SERVER_BASE
    );

    // First pass: capture the *canonical* output (spec-derived serverUrl) for the file snapshot.
    // We don't keep this on disk — the consumer needs the mock-targeted variant.
    const snapshotGen = runGenerateClient([fixture, '--output', generatedFile]);
    if (snapshotGen.status !== 0) {
      throw new Error(`generate-client (snapshot pass) failed:\n${snapshotGen.stderr}`);
    }
    rawGenerated = readFileSync(generatedFile, 'utf-8');

    // Second pass: regenerate with --server-url so the consumer's import targets the mock.
    // This is the file the consumer actually loads — and replaces the old string-replace hack.
    const consumerGen = runGenerateClient([
      fixture,
      '--output',
      generatedFile,
      '--server-url',
      SERVER_BASE,
    ]);
    if (consumerGen.status !== 0) {
      throw new Error(`generate-client (consumer pass) failed:\n${consumerGen.stderr}`);
    }
    generated = readFileSync(generatedFile, 'utf-8');
    if (!generated.includes(`serverUrl: "${SERVER_BASE}"`)) {
      throw new Error(`--server-url was not honoured; expected \`serverUrl: "${SERVER_BASE}"\``);
    }

    // Type-check the consumer.
    expectTscPasses(['--noEmit', '-p', workDir]);

    // Run consumer.
    const run = runTsx(join(workDir, 'index.ts'), [], {
      cwd: workDir,
      env: { ...process.env, CAFE_BASE: SERVER_BASE },
    });
    if (run.status !== 0) {
      throw new Error(`consumer failed:\nstdout:\n${run.stdout}\nstderr:\n${run.stderr}`);
    }
    results = JSON.parse(run.stdout.trim()) as StepResult[];

    log = await serverLog<LogEntry[]>(SERVER_BASE);
  }, 120_000);

  afterAll(async () => {
    if (serverProcess) await killServer(serverProcess);
    rmSync(workDir, { recursive: true, force: true });
  });

  test('generated file matches the committed snapshot (cafe.snapshot.ts)', async () => {
    // Full-file guard against accidental emitter regressions. The PR diff against this
    // snapshot is the single most informative signal when the IR builder or emitter changes.
    // After an intentional emitter change, regenerate with: `npm run client-generators -- -u`.
    await expect(rawGenerated).toMatchFileSnapshot(snapshotFile);
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

  // The consumer sets each credential once on the instance; every OAuth2 operation must
  // then carry the bearer header, every ApiKey operation the X-API-Key header,
  // and `security: []` operations neither.
  test('a bearer credential injects Authorization on OAuth2 operations (getOrderById)', () => {
    const entry = log.find(
      (e) => e.method === 'GET' && e.url === '/orders/ord_01h1s5z6vf2mm1mz3hevnn9va7'
    );
    expect(entry).toBeDefined();
    expect(entry!.headers['authorization']).toBe('Bearer test-bearer-token');
  });

  test('an apiKey credential injects X-API-Key on ApiKey operations (getRevenue)', () => {
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
});

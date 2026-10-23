import { generateClient } from '@redocly/client-generator';
import { readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  copyConsumer,
  expectTscPasses,
  runTsx,
  type CommandResult,
} from '../../helpers/helpers.js';
import { MockServer } from '../../helpers/mock-server.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, '../../fixtures/cafe.yaml');

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

const snapshotFile = join(__dirname, '__snapshots__', 'cafe.snapshot.ts');

describe('generate-client cafe.yaml single-file client', () => {
  let server: MockServer;
  let results: StepResult[] = [];
  let log: LogEntry[] = [];
  /** The generator output from cafe.yaml with no options, for the file snapshot. */
  let rawGenerated = '';
  let workDir = '';
  let consumerRun: CommandResult;

  beforeAll(async () => {
    workDir = copyConsumer(join(__dirname, 'consumer'));
    const generatedFile = join(workDir, 'api.ts');

    server = await MockServer.start(fixture);

    // The snapshot keeps the serverUrl from the description. The consumer imports a second
    // generation that points at the mock server.
    await generateClient({ api: fixture, output: generatedFile });
    rawGenerated = readFileSync(generatedFile, 'utf-8');
    await generateClient({ api: fixture, output: generatedFile, serverUrl: server.url });

    // Type-check the consumer.
    expectTscPasses(['--noEmit', '-p', workDir]);

    // Run consumer.
    consumerRun = await runTsx(join(workDir, 'index.ts'), [], {
      cwd: workDir,
      env: { ...process.env, CAFE_BASE: server.url },
    });
    // A crashed consumer prints no JSON; the test below reports its output.
    results =
      consumerRun.status === 0 ? (JSON.parse(consumerRun.stdout.trim()) as StepResult[]) : [];

    for (const request of server.requests) {
      log.push({
        method: request.method,
        url: request.url,
        contentType: request.headers['content-type'],
        body: request.body === undefined ? '' : request.body.toString('utf-8'),
        headers: request.headers,
      });
    }
  });

  afterAll(async () => {
    await server.close();
    rmSync(workDir, { recursive: true, force: true });
  });

  test('the consumer runs to the end', () => {
    expect(
      consumerRun.status,
      `consumer failed:\nstdout:\n${consumerRun.stdout}\nstderr:\n${consumerRun.stderr}`
    ).toBe(0);
  });

  test('the mock server handled every request', () => {
    expect(server.handlerErrors).toEqual([]);
  });

  test('generated file matches the committed snapshot (cafe.snapshot.ts)', async () => {
    // A full-file guard against unintended emitter changes.
    // After an intended emitter change, regenerate with: `npm run client-generators -- -u`.
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
    // The mock server generates the body from the OpenAPI description, so the exact size and
    // MIME type can change. The contract is that the binary path returns a non-empty Blob.
    expect(photoStep).toMatchObject({ kind: 'ok', data: { kind: 'blob' } });
    const data = (photoStep as { data: { size: number } }).data;
    expect(data.size).toBeGreaterThan(0);
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
    expect(step).toMatchObject({ kind: 'ok', data: { agree: true, exclusive: true } });
  });

  test('204 No Content paths return void (deleteOrder)', () => {
    const step = results.find((r) => r.name === 'deleteOrder');
    expect(step).toEqual({ kind: 'ok', name: 'deleteOrder' });
  });

  test('listOrderItems serialises query filter and returns an array', () => {
    const entry = log.find((e) => e.method === 'GET' && e.url.startsWith('/order-items'));
    expect(entry).toBeDefined();
    expect(entry!.url).toContain('filter=orderId%3Aord_01h1s5z6vf2mm1mz3hevnn9va7');
    const step = results.find((r) => r.name === 'listOrderItems');
    expect(step).toMatchObject({ kind: 'ok', data: expect.any(Array) });
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

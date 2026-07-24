import {
  createMockServer,
  type MockServerRequest,
  type MockServerRequestHandler,
} from '@redocly/mock-server';
import * as http from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

type LogEntry = {
  method: string;
  url: string;
  contentType: string | undefined;
  body: string;
  headers: Record<string, string>;
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const SPEC_PATH = join(__dirname, '..', 'fixtures', 'cafe.yaml');
const PORT = Number.parseInt(process.env.CAFE_SERVER_PORT ?? '3101', 10);

const requestLog: LogEntry[] = [];

async function readBody(req: http.IncomingMessage): Promise<Buffer | undefined> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  return chunks.length > 0 ? Buffer.concat(chunks) : undefined;
}

// @redocly/mock-server's request shape is decoupled from Node's `http` types,
// so we adapt the IncomingMessage to the small interface the mock handler expects.
// We also inject benign auth headers when missing: cafe.yaml has OAuth2 and ApiKey
// requirements on most operations, but the generated client doesn't ship credentials
// in tests. Mock-server's auth checks are presence-only, so a dummy bearer/api-key
// is enough to satisfy them without changing what the consumer actually sends.
function toMockRequest(req: http.IncomingMessage, body: Buffer | undefined): MockServerRequest {
  const { pathname, search } = new URL(req.url ?? '/', 'http://localhost');
  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') {
      headers[name.toLowerCase()] = value;
    } else if (Array.isArray(value)) {
      headers[name.toLowerCase()] = value.join(',');
    }
  }
  if (!headers['authorization']) {
    headers['authorization'] = 'Bearer test-token';
  }
  if (!headers['x-api-key']) {
    headers['x-api-key'] = 'test-key';
  }
  // POST /menu is multipart/form-data with a typed schema (number, boolean), but
  // FormData transmits everything as strings, so mock-server's body validation rejects
  // the request. We force a 201 example response, which the test contract already covers
  // by asserting on the (logged) multipart payload the consumer sent.
  if (pathname === '/menu' && (req.method ?? 'GET').toUpperCase() === 'POST') {
    headers['x-redocly-response-status'] = '201';
  }
  return {
    path: pathname,
    method: req.method ?? 'GET',
    query: search !== '' ? search : undefined,
    headers,
    getBody: () => Promise.resolve(body),
  };
}

let handler: MockServerRequestHandler;

const server = http.createServer(async (req, res) => {
  const method = req.method ?? 'GET';
  const url = req.url ?? '';

  // Test-only utility endpoints. These bypass the mock server entirely so the
  // test harness can probe readiness, inspect the request log, and exercise
  // the generated ApiError path without relying on spec semantics.
  if (url === '/__test__/ready') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('ready');
    return;
  }
  if (url === '/__test__/log') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(requestLog));
    return;
  }
  if (url === '/__test__/log/clear' && method === 'POST') {
    requestLog.length = 0;
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('cleared');
    return;
  }
  if (url === '/__test__/boom' && method === 'GET') {
    res.writeHead(500, { 'Content-Type': 'application/problem+json; charset=utf-8' });
    res.end(JSON.stringify({ type: 'about:blank', title: 'Boom', status: 500 }));
    return;
  }

  const body = await readBody(req);
  const loggedHeaders: Record<string, string> = {};
  for (const [name, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') {
      loggedHeaders[name.toLowerCase()] = value;
    } else if (Array.isArray(value)) {
      loggedHeaders[name.toLowerCase()] = value.join(',');
    }
  }
  requestLog.push({
    method,
    url,
    contentType: req.headers['content-type'],
    body: body ? body.toString('utf8') : '',
    headers: loggedHeaders,
  });

  try {
    const response = await handler(toMockRequest(req, body));
    res.writeHead(response.statusCode, response.headers ?? {});
    res.end(response.body);
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'mock-server failed' }));
  }
});

async function main(): Promise<void> {
  handler = await createMockServer(SPEC_PATH);
  server.listen(PORT, () => {
    process.stdout.write(`READY ${PORT}\n`);
  });
}

const shutdown = (): void => {
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

main().catch((error) => {
  process.stderr.write(
    `cafe mock server failed to start: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`
  );
  process.exit(1);
});

import {
  createMockServer,
  type MockServerRequest,
  type MockServerRequestHandler,
} from '@redocly/mock-server';
import * as http from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

type LogEntry = { method: string; url: string };

const __dirname = dirname(fileURLToPath(import.meta.url));
const SPEC_PATH = join(__dirname, '..', 'fixtures', 'base.yaml');
const PORT = Number.parseInt(process.env.BASE_SERVER_PORT ?? '3102', 10);

const requestLog: LogEntry[] = [];

async function readBody(req: http.IncomingMessage): Promise<Buffer | undefined> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  return chunks.length > 0 ? Buffer.concat(chunks) : undefined;
}

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

  requestLog.push({ method, url });

  const { pathname } = new URL(url, 'http://localhost');

  // The cancellation operation needs a response slow enough to abort mid-flight.
  // mock-server replies instantly, so this path is held open here instead of
  // being delegated to it.
  if (method === 'GET' && /^\/pets\/\d+\/cancel-test$/.test(pathname)) {
    let aborted = false;
    req.on('close', () => {
      aborted = true;
    });
    const timer = setTimeout(() => {
      if (aborted) return;
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ id: 1, name: 'Slow', status: 'available' }));
    }, 30_000);
    res.on('close', () => clearTimeout(timer));
    return;
  }

  const body = await readBody(req);
  try {
    const response = await handler(toMockRequest(req, body));
    res.writeHead(response.statusCode, response.headers ?? {});
    res.end(response.body);
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        error: 'mock-server failed',
        message: error instanceof Error ? error.message : String(error),
      })
    );
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
    `base mock server failed to start: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`
  );
  process.exit(1);
});

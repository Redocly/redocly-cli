import { createMockServer, type MockServerRequestHandler } from '@redocly/mock-server';
import * as http from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { answerTestRoute, listen, readBody, toMockRequest } from './support.js';

type LogEntry = { method: string; url: string };

const __dirname = dirname(fileURLToPath(import.meta.url));
const SPEC_PATH = join(__dirname, '..', 'fixtures', 'base.yaml');
const PORT = Number.parseInt(process.env.BASE_SERVER_PORT ?? '3102', 10);

const requestLog: LogEntry[] = [];

let handler: MockServerRequestHandler;

const server = http.createServer(async (req, res) => {
  if (answerTestRoute(req, res, requestLog)) {
    return;
  }
  const method = req.method ?? 'GET';
  const url = req.url ?? '';
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
  } catch {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'mock-server failed' }));
  }
});

createMockServer(SPEC_PATH)
  .then((mockHandler) => {
    handler = mockHandler;
    listen(server, PORT);
  })
  .catch((error: unknown) => {
    process.stderr.write(
      `base mock server failed to start: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`
    );
    process.exit(1);
  });

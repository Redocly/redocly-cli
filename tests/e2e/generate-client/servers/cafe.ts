import { createMockServer, type MockServerRequestHandler } from '@redocly/mock-server';
import * as http from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { answerTestRoute, headerRecord, listen, readBody, toMockRequest } from './support.js';

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

let handler: MockServerRequestHandler;

const server = http.createServer(async (req, res) => {
  if (answerTestRoute(req, res, requestLog)) {
    return;
  }
  const method = req.method ?? 'GET';
  const url = req.url ?? '';

  const body = await readBody(req);
  requestLog.push({
    method,
    url,
    contentType: req.headers['content-type'],
    body: body ? body.toString('utf8') : '',
    headers: headerRecord(req),
  });

  const mockRequest = toMockRequest(req, body);
  // cafe.yaml has OAuth2 and ApiKey requirements on most operations, but the generated
  // client sends no credentials in these tests. Mock-server's auth checks are
  // presence-only, so a dummy bearer and api key satisfy them without changing what
  // the consumer actually sent (the log above keeps the real headers).
  if (!mockRequest.headers['authorization']) {
    mockRequest.headers['authorization'] = 'Bearer test-token';
  }
  if (!mockRequest.headers['x-api-key']) {
    mockRequest.headers['x-api-key'] = 'test-key';
  }
  // POST /menu is multipart/form-data with a typed schema (number, boolean), but
  // FormData transmits everything as strings, so mock-server's body validation rejects
  // the request. We force a 201 example response, which the test contract already covers
  // by asserting on the (logged) multipart payload the consumer sent.
  if (mockRequest.path === '/menu' && method.toUpperCase() === 'POST') {
    mockRequest.headers['x-redocly-response-status'] = '201';
  }

  try {
    const response = await handler(mockRequest);
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
      `cafe mock server failed to start: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`
    );
    process.exit(1);
  });

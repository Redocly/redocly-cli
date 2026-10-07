// Throwaway HTTP server for the cli e2e: canned cursor pages, an echo POST, and a
// request log (`/__test__/log`) so the test can assert query strings, auth headers,
// forwarded bodies, and hit counts.
import * as http from 'node:http';

import { answerTestRoute, listen, readBody } from './support.js';

const PORT = Number.parseInt(process.env.CLI_SERVER_PORT ?? '3108', 10);

type LogEntry = { method: string; url: string; authorization?: string; body?: string };
const requestLog: LogEntry[] = [];

const server = http.createServer(async (req, res) => {
  const method = req.method ?? 'GET';
  const url = req.url ?? '/';
  const { pathname, searchParams } = new URL(url, 'http://localhost');

  if (answerTestRoute(req, res, requestLog)) {
    return;
  }

  const body = (await readBody(req))?.toString('utf-8');
  requestLog.push({
    method,
    url,
    ...(typeof req.headers.authorization === 'string'
      ? { authorization: req.headers.authorization }
      : {}),
    ...(body !== undefined ? { body } : {}),
  });

  const json = (status: number, payload: unknown) =>
    res.writeHead(status, { 'content-type': 'application/json' }).end(JSON.stringify(payload));

  if (method === 'GET' && pathname === '/orders') {
    if (searchParams.get('cursor') === 'page-2') {
      json(200, { orders: [{ id: 'ord_2', item: 'tea', quantity: 1 }] });
    } else {
      json(200, {
        orders: [{ id: 'ord_1', item: 'espresso', quantity: 2 }],
        nextCursor: 'page-2',
      });
    }
    return;
  }
  if (method === 'POST' && pathname === '/orders') {
    json(201, { id: 'ord_new', ...JSON.parse(body ?? '{}') });
    return;
  }
  if (method === 'GET' && pathname.startsWith('/orders/')) {
    json(200, { id: pathname.split('/').pop(), item: 'espresso', quantity: 2 });
    return;
  }
  if (method === 'GET' && pathname === '/ping') {
    res.writeHead(204).end();
    return;
  }
  json(404, { message: 'not found' });
});

listen(server, PORT);

import * as http from 'node:http';

// A hand-written pagination server: three cursor pages of orders keyed by an opaque
// cursor (the last page carries no nextCursor — the stop signal), and an offset-sliced
// menu that returns an empty page past the end. Every API request lands in a log the
// test reads back, with a reset hook so each consumer run asserts over its own slice.

type LogEntry = { method: string; url: string };
type Order = { id: string; status: string };

const PORT = Number.parseInt(process.env.PAGINATION_SERVER_PORT ?? '3131', 10);

let requestLog: LogEntry[] = [];

const ORDERS: Order[] = ['o-1', 'o-2', 'o-3', 'o-4', 'o-5'].map((id) => ({
  id,
  status: 'open',
}));

// Cursor pages (2 + 2 + 1), keyed by the cursor that requests them ('' = first page).
const ORDER_PAGES: Record<string, { orders: Order[]; nextCursor?: string }> = {
  '': { orders: ORDERS.slice(0, 2), nextCursor: 'c2' },
  c2: { orders: ORDERS.slice(2, 4), nextCursor: 'c3' },
  c3: { orders: ORDERS.slice(4) },
};

const MENU = ['espresso', 'latte', 'mocha', 'flat white', 'cortado'].map((name, index) => ({
  id: `m-${index + 1}`,
  name,
}));

const server = http.createServer((req, res) => {
  const method = req.method ?? 'GET';
  const url = req.url ?? '';
  const { pathname, searchParams } = new URL(url, 'http://localhost');

  if (pathname === '/__test__/ready') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('ready');
    return;
  }
  if (pathname === '/__test__/log') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(requestLog));
    return;
  }
  if (pathname === '/__test__/reset') {
    requestLog = [];
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('reset');
    return;
  }

  requestLog.push({ method, url });

  if (method === 'GET' && pathname === '/orders') {
    const page = ORDER_PAGES[searchParams.get('cursor') ?? ''];
    if (page) {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(page));
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ title: 'unknown cursor' }));
    return;
  }

  if (method === 'GET' && pathname === '/menu') {
    const offset = Number.parseInt(searchParams.get('offset') ?? '0', 10);
    const limit = Number.parseInt(searchParams.get('limit') ?? '2', 10);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ items: MENU.slice(offset, offset + limit), total: MENU.length }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ title: 'not found' }));
});

// The test process keeps a pooled connection from its readiness probe and fetches the
// log after generate + tsc + the consumer runs (~10s). Outlive that gap so the pooled
// socket is not reset mid-reuse.
server.keepAliveTimeout = 60_000;

server.listen(PORT, () => {
  process.stdout.write(`READY ${PORT}\n`);
});

const shutdown = (): void => {
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

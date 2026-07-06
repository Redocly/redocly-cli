import * as http from 'node:http';

// A hand-written server for the package-runtime consumer: echoes enough request
// detail (auth header, URL) for the test to assert the runtime's routing, and
// serves a short SSE stream that ends cleanly.

type LogEntry = { method: string; url: string; auth: string | null };

const PORT = Number.parseInt(process.env.PKG_SERVER_PORT ?? '3123', 10);

const requestLog: LogEntry[] = [];

async function readBody(req: http.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf-8');
}

const server = http.createServer(async (req, res) => {
  const method = req.method ?? 'GET';
  const url = req.url ?? '';
  const { pathname } = new URL(url, 'http://localhost');

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

  const auth = typeof req.headers.authorization === 'string' ? req.headers.authorization : null;
  requestLog.push({ method, url, auth });

  if (method === 'GET' && pathname.startsWith('/orders/')) {
    const id = decodeURIComponent(pathname.slice('/orders/'.length));
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ id, status: 'open' }));
    return;
  }
  if (method === 'POST' && pathname === '/orders') {
    const body = JSON.parse(await readBody(req)) as { status: string };
    res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ id: 'created-1', status: body.status }));
    return;
  }
  if (method === 'GET' && pathname === '/configure-op') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify('ok'));
    return;
  }
  if (method === 'GET' && pathname === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write('id: 1\ndata: {"seq":1,"text":"a"}\n\n');
    res.write('id: 2\ndata: {"seq":2,"text":"b"}\n\n');
    res.end(); // clean close — the client finishes without reconnecting
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ title: 'not found' }));
});

// The test process keeps a pooled connection from its readiness probe and fetches
// the log only after generate + tsc + the consumer run (~10s). Outlive that gap so
// the pooled socket is not reset mid-reuse.
server.keepAliveTimeout = 60_000;

server.listen(PORT, () => {
  process.stdout.write(`package-runtime server listening on ${PORT}\n`);
});

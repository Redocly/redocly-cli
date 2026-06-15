import * as http from 'node:http';

// A hand-written SSE server. The generated client streams frames; we drop the
// first connection mid-stream (to exercise auto-reconnect via Last-Event-ID) and
// keep a long-lived stream open for the abort scenario. Each connection records
// the `Last-Event-ID` header it received (or null) so the test can assert resume.

type LogEntry = { path: string; lastEventId: string | null };

const PORT = Number.parseInt(process.env.SSE_SERVER_PORT ?? '3104', 10);

const requestLog: LogEntry[] = [];

function writeFrame(res: http.ServerResponse, frame: string): void {
  res.write(frame);
}

const server = http.createServer((req, res) => {
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

  const lastEventId =
    typeof req.headers['last-event-id'] === 'string' ? req.headers['last-event-id'] : null;
  requestLog.push({ path: pathname, lastEventId });

  // The reconnect stream: drop after two frames, then resume from `Last-Event-ID: 2`.
  if (pathname === '/messages') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    if (lastEventId === '2') {
      // Reconnect: deliver the next frame and close.
      writeFrame(res, 'id: 3\ndata: {"text":"c","seq":3}\n\n');
      res.end();
      return;
    }
    // First connect: deliver two frames then drop the connection (simulates a drop).
    writeFrame(res, 'id: 1\nevent: msg\ndata: {"text":"a","seq":1}\n\n');
    writeFrame(res, 'id: 2\ndata: {"text":"b","seq":2}\n\n');
    res.end();
    return;
  }

  // The abort stream: emit one frame, then hold the connection open so the
  // client can abort mid-stream.
  if (pathname === '/abort-messages') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    writeFrame(res, 'id: 1\ndata: {"text":"a","seq":1}\n\n');
    // Hold open: a periodic comment keeps the stream alive without new events.
    const keepAlive = setInterval(() => {
      res.write(': keep-alive\n\n');
    }, 200);
    res.on('close', () => clearInterval(keepAlive));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('not found');
});

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

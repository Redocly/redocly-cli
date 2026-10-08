// Echo server for the stream-bodies scenario. It records what every request put on
// the wire (the raw body, every Content-Type value, and how the body was framed) and
// answers 204, or 503 under /fail/ so the clients' retry policies have something to
// retry. stream-bodies.test.ts reads the log through GET /__test__/log.
import * as http from 'node:http';

type LogEntry = {
  method: string;
  url: string;
  contentTypes: string[];
  contentLength: string | undefined;
  transferEncoding: string | undefined;
  body: string;
};

const PORT = Number.parseInt(process.env.STREAM_SERVER_PORT ?? '3115', 10);

const requestLog: LogEntry[] = [];

const server = http.createServer(async (req, res) => {
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

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  // Every value separately: a Content-Type sent twice must show up twice.
  const contentTypes = req.rawHeaders.filter(
    (_, index) => index % 2 === 1 && req.rawHeaders[index - 1].toLowerCase() === 'content-type'
  );
  requestLog.push({
    method: req.method ?? '',
    url,
    contentTypes,
    contentLength: req.headers['content-length'],
    transferEncoding: req.headers['transfer-encoding'],
    body: Buffer.concat(chunks).toString('base64'),
  });

  res.writeHead(url.startsWith('/fail/') ? 503 : 204);
  res.end();
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

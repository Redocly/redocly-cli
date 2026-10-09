// Server for the write-only scenario. It records every request body and answers
// POST /customers with the registered customer, without the write-only `password`,
// as the description says. write-only.test.ts reads the log through GET /__test__/log
// and clears it through POST /__test__/reset before each client runs.
import * as http from 'node:http';

const PORT = Number.parseInt(process.env.WRITE_ONLY_SERVER_PORT ?? '3116', 10);

const requestLog: Array<{ method: string; url: string; body: unknown }> = [];

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
  if (url === '/__test__/reset') {
    requestLog.length = 0;
    res.writeHead(204).end();
    return;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  const body = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
  requestLog.push({ method: req.method ?? '', url, body });

  res.writeHead(201, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ id: 'c1', email: body.email }));
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

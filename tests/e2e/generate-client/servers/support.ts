import type { MockServerRequest } from '@redocly/mock-server';
import type * as http from 'node:http';

export async function readBody(req: http.IncomingMessage): Promise<Buffer | undefined> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  if (chunks.length === 0) {
    return undefined;
  }
  return Buffer.concat(chunks);
}

export function headerRecord(req: http.IncomingMessage): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') {
      headers[name.toLowerCase()] = value;
    } else if (Array.isArray(value)) {
      headers[name.toLowerCase()] = value.join(',');
    }
  }
  return headers;
}

/** Adapt a Node request to the small request shape `@redocly/mock-server` handles. */
export function toMockRequest(
  req: http.IncomingMessage,
  body: Buffer | undefined
): MockServerRequest {
  const { pathname, search } = new URL(req.url ?? '/', 'http://localhost');
  return {
    path: pathname,
    method: req.method ?? 'GET',
    query: search !== '' ? search : undefined,
    headers: headerRecord(req),
    getBody: () => Promise.resolve(body),
  };
}

export function answerTestRoute(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  requestLog: unknown[]
): boolean {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost');
  if (pathname === '/__test__/ready') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('ready');
    return true;
  }
  if (pathname === '/__test__/log') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(requestLog));
    return true;
  }
  return false;
}

export function listen(server: http.Server, port: number): void {
  server.listen(port, () => {
    process.stdout.write(`READY ${port}\n`);
  });
  const shutdown = (): void => {
    server.close(() => {
      process.exit(0);
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

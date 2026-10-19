// Echo server for the stream-bodies scenario. It records what every request put on
// the wire (the raw body, every Content-Type value, and how the body was framed) and
// answers 204, or 503 under /fail/ so the clients' retry policies have something to
// retry. The stream-bodies tests read the log through GET /__test__/log and clear it
// through POST /__test__/reset before each client runs.
import * as http from 'node:http';

import { answerTestRoute, listen, readBody } from '../servers/support.js';

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
  if (answerTestRoute(req, res, requestLog)) {
    return;
  }
  const url = req.url ?? '';
  if (url === '/__test__/reset') {
    requestLog.length = 0;
    res.writeHead(204).end();
    return;
  }

  const body = await readBody(req);
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
    body: body ? body.toString('base64') : '',
  });

  res.writeHead(url.startsWith('/fail/') ? 503 : 204);
  res.end();
});

listen(server, PORT);

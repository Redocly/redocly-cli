import * as http from 'node:http';

import { client, configure, getBearer, getQuery } from './client.js';

const captured: Array<{ url: string; auth?: string }> = [];
const server = http.createServer((request, response) => {
  captured.push({
    url: request.url ?? '',
    auth: request.headers['authorization'] as string | undefined,
  });
  response.writeHead(200, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({ id: 'x' }));
});

async function main() {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as { port: number }).port;
  configure({ serverUrl: 'http://127.0.0.1:' + port });
  client.auth.bearer(async () => 'tok');
  await getBearer();
  client.auth.apiKey('QueryKey', 'secret-key');
  await getQuery({ query: { limit: 5 } });
  await new Promise<void>((resolve) => server.close(() => resolve()));
  process.stdout.write(JSON.stringify(captured));
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

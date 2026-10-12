import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { type AddressInfo, connect } from 'node:net';
import { dirname, join } from 'node:path';
import { type TLSSocket } from 'node:tls';
import { fileURLToPath } from 'node:url';

import { getParams, runCommandAsync } from '../../helpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const certsDir = join(__dirname, 'certs');

const readCert = (name: string) => readFileSync(join(certsDir, name));

let tunnels: string[] = [];
let api: Server;
let proxy: Server;

async function listen(server: Server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return (server.address() as AddressInfo).port;
}

beforeAll(() => {
  // The API requires a client certificate and reports what it received.
  api = createHttpsServer(
    {
      key: readCert('server.key'),
      cert: readCert('server.crt'),
      ca: readCert('ca.crt'),
      requestCert: true,
      rejectUnauthorized: true,
    },
    (req, res) => {
      res.setHeader('content-type', 'application/json');
      if (req.url === '/whoami') {
        res.end(
          JSON.stringify({ clientCert: (req.socket as TLSSocket).getPeerCertificate().subject.CN })
        );
        return;
      }
      req.resume();
      req.on('end', () => {
        const contentType = req.headers['content-type'] ?? '';
        res.end(JSON.stringify({ multipart: contentType.startsWith('multipart/form-data') }));
      });
    }
  );

  // A CONNECT proxy that tunnels to the API and records every tunnel it opens.
  proxy = createServer();
  proxy.on('connect', (req, proxySocket) => {
    tunnels.push(req.url!);
    const [host, port] = req.url!.split(':');
    const targetSocket = connect(Number(port), host, () => {
      proxySocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      targetSocket.pipe(proxySocket);
      proxySocket.pipe(targetSocket);
    });
    proxySocket.on('close', () => targetSocket.destroy());
    targetSocket.on('error', () => proxySocket.destroy());
  });
});

beforeEach(() => {
  tunnels = [];
});

afterAll(() => {
  api.closeAllConnections();
  api.close();
  proxy.closeAllConnections();
  proxy.close();
});

test('sends the client certificate and a multipart body through the proxy', async () => {
  const apiPort = await listen(api);
  const proxyPort = await listen(proxy);
  const mtls = {
    localhost: {
      clientCert: join(certsDir, 'client.crt'),
      clientKey: join(certsDir, 'client.key'),
      caCert: join(certsDir, 'ca.crt'),
    },
  };

  const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');
  const args = getParams(indexEntryPoint, [
    'respect',
    join(__dirname, 'mtls-via-proxy.arazzo.yaml'),
    '--mtls',
    JSON.stringify(mtls),
  ]);

  const result = await runCommandAsync('node', args, {
    env: {
      HTTPS_PROXY: `http://127.0.0.1:${proxyPort}`,
      NO_PROXY: '',
      REDOCLY_TELEMETRY: 'off',
      REDOCLY_CLI_RESPECT_SERVER: `mtls-api=https://localhost:${apiPort}`,
    },
  });

  expect(result).toMatchSnapshot();
  expect(new Set(tunnels)).toEqual(new Set([`localhost:${apiPort}`]));
}, 60_000);

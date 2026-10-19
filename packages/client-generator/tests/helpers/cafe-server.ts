import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { MockServer } from './mock-server.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** The mock server for cafe.yaml, shared by the cafe and module-runtime tests. */
export function startCafeServer(): Promise<MockServer> {
  return MockServer.start(join(__dirname, '../fixtures/cafe.yaml'), {
    fallback: ({ request, defaultResponse }) => {
      // cafe.yaml has OAuth2 and ApiKey requirements on most operations, but the generated
      // client sends no credentials in these tests. Mock-server's auth checks are
      // presence-only, so a dummy bearer and api key satisfy them. The request records keep
      // the headers the consumer really sent.
      const extraHeaders: Record<string, string> = {};
      if (request.headers['authorization'] === undefined) {
        extraHeaders['authorization'] = 'Bearer test-token';
      }
      if (request.headers['x-api-key'] === undefined) {
        extraHeaders['x-api-key'] = 'test-key';
      }
      // POST /menu is multipart/form-data with a typed schema (number, boolean), but
      // FormData sends every field as a string, so mock-server's body validation rejects
      // the request. Force the 201 example; the test asserts on the multipart payload itself.
      if (request.operationId === 'createMenuItem') {
        extraHeaders['x-redocly-response-status'] = '201';
      }
      return defaultResponse(extraHeaders);
    },
  });
}

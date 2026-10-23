// The server of the write-only scenario, shared by the TypeScript, Python, Go, and PHP
// tests. It answers `write-only.yaml` without the write-only `password`, as the
// description says, so each generated client can prove that it still sends the password
// in the request and decodes the response without it.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { MockServer } from './mock-server.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const writeOnlyFixture = join(__dirname, '../fixtures/write-only.yaml');

const customer = { id: 'c1', email: 'ada@example.com' };

export function startWriteOnlyServer(): Promise<MockServer> {
  return MockServer.start(writeOnlyFixture, {
    handlers: {
      createCustomer: () => ({ status: 201, body: customer }),
      listCustomers: () => ({ status: 200, body: [customer] }),
    },
  });
}

/** The one request every client sends: the password travels, whatever else it adds. */
export function expectPasswordSent(server: MockServer): void {
  const sent = server.requests.find((request) => request.operationId === 'createCustomer');
  expect(sent?.method).toBe('POST');
  expect(JSON.parse(sent?.body?.toString('utf-8') ?? '{}')).toEqual(
    expect.objectContaining({ email: 'ada@example.com', password: 'correct horse' })
  );
}

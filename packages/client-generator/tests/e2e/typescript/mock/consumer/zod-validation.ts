// Every factory that has a zod schema of the same name, and every operation's default
// handler (fetched through MSW), must pass validation. Prints the failures as JSON.
import { setupServer } from 'msw/node';

import * as mocks from './client.mocks.ts';
import { OPERATIONS } from './client.ts';
import * as zod from './client.zod.ts';

type Schema = { safeParse(value: unknown): { success: boolean; error?: { message: string } } };

const failures: string[] = [];
const record = (label: string, schema: Schema, value: unknown): void => {
  const result = schema.safeParse(value);
  if (!result.success) failures.push(`${label}: ${result.error?.message}`);
};

for (const [name, factory] of Object.entries(mocks)) {
  const schema = (zod as Record<string, unknown>)[`${name.replace(/^create/, '')}Schema`];
  if (name.startsWith('create') && schema) {
    record(name, schema as Schema, (factory as () => unknown)());
  }
}

const server = setupServer(...mocks.handlers);
server.listen({ onUnhandledRequest: 'error' });
for (const [id, operation] of Object.entries(OPERATIONS)) {
  const schema = (zod.operationSchemas as Record<string, { response?: Schema }>)[id]?.response;
  if (!schema) continue;
  const path = operation.path.replace(/\{[^}]+\}/g, '1');
  const response = await fetch(`https://api.example.com${path}`, { method: operation.method });
  record(`${id}Handler`, schema, await response.json());
}
server.close();

process.stdout.write(JSON.stringify(failures));

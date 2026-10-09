// Runtime smoke for write-only properties in the generated TypeScript client and its zod
// schemas. Run by write-only.test.ts with the server's base URL as the only argument.
// The request sends the password; the response comes back without it, which the
// response type and the zod response schema both accept.
import { client } from './client/client.js';
import { zodValidation } from './client/client.zod.js';

client.configure({
  serverUrl: process.argv[2],
  middleware: [zodValidation({ response: 'throw' })],
});

const customer = await client.createCustomer({
  body: { email: 'ada@example.com', password: 'correct horse' },
});
// Fails to compile if the response type still has the write-only `password`.
const typedWithPassword: 'password' extends keyof typeof customer ? true : false = false;

process.stdout.write(`${JSON.stringify(customer)} ${typedWithPassword}\nTYPESCRIPT_SMOKE_OK\n`);

// Runtime smoke for write-only properties in the generated TypeScript client and its zod
// schemas. Run by write-only.test.ts with the server's base URL as the only argument.
// The request sends the password; the responses come back without it, which the
// response types and the zod response schemas both accept, for one customer and a list.
import { client } from './client/client.js';
import { zodValidation } from './client/client.zod.js';

client.configure({
  serverUrl: process.argv[2],
  middleware: [zodValidation({ response: 'throw' })],
});

const customer = await client.createCustomer({
  body: { email: 'ada@example.com', password: 'correct horse' },
});
const customers = await client.listCustomers();
// Fails to compile if a response type still has the write-only `password`.
const typedWithPassword: 'password' extends keyof typeof customer ? true : false = false;
const listedWithPassword: 'password' extends keyof (typeof customers)[number] ? true : false =
  false;

process.stdout.write(
  `${JSON.stringify([customer, customers])} ${typedWithPassword} ${listedWithPassword}\nTYPESCRIPT_SMOKE_OK\n`
);

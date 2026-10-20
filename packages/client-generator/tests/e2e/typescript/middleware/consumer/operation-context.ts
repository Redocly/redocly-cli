import { configure, use, createPet } from './client.ts';

let operation: unknown;
configure({
  fetch: (async () =>
    new Response('[]', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })) as unknown as typeof fetch,
});
use({
  onRequest: (ctx) => {
    operation = ctx.operation;
  },
});
await createPet({ body: { name: 'Rex' } });
console.log(JSON.stringify({ op: operation }));

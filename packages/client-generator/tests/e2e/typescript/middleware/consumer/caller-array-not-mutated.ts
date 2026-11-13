import { configure, use, listPets, type Middleware } from './client.ts';

const mine: Middleware[] = [];
configure({
  middleware: mine,
  fetch: (async () =>
    new Response('[]', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })) as unknown as typeof fetch,
});
use({ onRequest: () => {} });
await listPets();
console.log(JSON.stringify({ mineLength: mine.length }));

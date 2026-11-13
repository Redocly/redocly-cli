import { configure, use, listPets } from './client.ts';

const order: string[] = [];
configure({
  onRequest: () => {
    order.push('config');
  },
  fetch: (async () =>
    new Response('[]', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })) as unknown as typeof fetch,
});
use({
  onRequest: () => {
    order.push('mw');
  },
});
await listPets();
console.log(JSON.stringify({ order }));

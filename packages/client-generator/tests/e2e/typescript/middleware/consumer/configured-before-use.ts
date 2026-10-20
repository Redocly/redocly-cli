import { client } from './client.ts';

const order: string[] = [];
client.configure({
  fetch: (async () =>
    new Response('[]', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })) as unknown as typeof fetch,
  middleware: [
    {
      onRequest: () => {
        order.push('configured');
      },
    },
  ],
});
client.use({
  onRequest: () => {
    order.push('use');
  },
});
await client.listPets();
console.log(JSON.stringify({ order }));

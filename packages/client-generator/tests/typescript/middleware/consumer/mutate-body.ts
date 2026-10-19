import { configure, use, createPet } from './client.ts';

let sent = '';
configure({
  fetch: (async (_url: string, init: RequestInit) => {
    sent = init.body as string;
    return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch,
});
use({
  onRequest: (ctx) => {
    (ctx.body as { name: string }).name = 'Mutated';
  },
});
await createPet({ body: { name: 'Rex' } });
console.log(JSON.stringify({ sent }));

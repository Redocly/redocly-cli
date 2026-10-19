import { configure, use, listPets } from './client.ts';

const order: string[] = [];
let headers: Record<string, string> = {};
configure({
  fetch: (async (_url: string, init: RequestInit) => {
    headers = init.headers as Record<string, string>;
    return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch,
});
use(
  {
    onRequest: (ctx) => {
      order.push('req-A');
      ctx.headers['X-A'] = '1';
    },
    onResponse: () => {
      order.push('res-A');
    },
  },
  {
    onRequest: (ctx) => {
      order.push('req-B');
      ctx.headers['X-B'] = '1';
    },
    onResponse: () => {
      order.push('res-B');
    },
  }
);
await listPets();
console.log(JSON.stringify({ order, hasA: 'X-A' in headers, hasB: 'X-B' in headers }));

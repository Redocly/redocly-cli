import { configure, use, listPets } from './client.ts';

let url = '';
let header = '';
configure({
  serverUrl: 'https://multi.example.com',
  fetch: (async (requestUrl: string, init: RequestInit) => {
    url = requestUrl;
    header = (init.headers as Record<string, string>)['X-MW'];
    return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch,
});
use({
  onRequest: (ctx) => {
    ctx.headers['X-MW'] = 'yes';
  },
});
await listPets();
console.log(JSON.stringify({ url, header }));

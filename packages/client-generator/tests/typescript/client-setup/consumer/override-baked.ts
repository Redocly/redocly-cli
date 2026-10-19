import { configure, listPets } from './client.ts';

let url = '';
configure({
  serverUrl: 'https://override.example.com',
  fetch: (async (requestUrl: string) => {
    url = requestUrl;
    return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch,
});
await listPets();
console.log(JSON.stringify({ url }));

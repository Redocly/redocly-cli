import { client } from './client.ts';

let captured = '';
client.configure({
  fetch: (async (url: string) => {
    captured = String(url);
    return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch,
});
await client.listPets();
console.log(JSON.stringify({ captured }));

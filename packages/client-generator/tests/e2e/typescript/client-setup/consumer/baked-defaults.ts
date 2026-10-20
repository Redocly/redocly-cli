import { listPets } from './client.ts';

// No configure() and no use(): the baked setup must supply the URL and the header.
let url = '';
let header = '';
globalThis.fetch = (async (requestUrl: string, init: RequestInit) => {
  url = requestUrl;
  header = (init.headers as Record<string, string>)['X-Baked'];
  return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
}) as unknown as typeof fetch;
await listPets();
console.log(JSON.stringify({ url, header }));

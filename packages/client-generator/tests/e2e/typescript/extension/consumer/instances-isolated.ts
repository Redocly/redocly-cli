import { createClient, OPERATIONS, type Ops } from './client.ts';

const calls: Array<{ tag: string; url: string; tenant: string }> = [];
const makeFetch = (tag: string) =>
  (async (url: string, init: RequestInit) => {
    const headers = init.headers as Record<string, string>;
    calls.push({ tag, url: String(url), tenant: headers['X-Tenant'] });
    return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch;

const clientA = createClient<Ops>(OPERATIONS, {
  serverUrl: 'https://a.example',
  headers: { 'X-Tenant': 'A' },
  fetch: makeFetch('a'),
});
const clientB = createClient<Ops>(OPERATIONS, {
  serverUrl: 'https://b.example',
  headers: { 'X-Tenant': 'B' },
  fetch: makeFetch('b'),
});

await clientA.listPets();
await clientB.listPets();
console.log(JSON.stringify(calls));

import { configure, listPets } from './client.ts';

const seen: { url?: string; headers?: Record<string, string> } = {};
configure({
  serverUrl: 'https://configured.example',
  headers: { 'X-Tenant': 'acme' },
  onRequest: (ctx) => {
    ctx.headers['X-Trace'] = 'trace-123';
  },
  fetch: (async (url: string, init: RequestInit) => {
    seen.url = String(url);
    seen.headers = init.headers as Record<string, string>;
    return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch,
});

await listPets();
console.log(JSON.stringify(seen));

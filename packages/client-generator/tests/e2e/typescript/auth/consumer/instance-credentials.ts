import { createClient, OPERATIONS, type Ops } from './client.js';

const calls: (string | null)[] = [];
const fakeFetch = (async (_url: string, init?: RequestInit) => {
  const headers = (init?.headers ?? {}) as Record<string, string>;
  calls.push(headers['Authorization'] ?? null);
  return new Response('{"id":"x"}', {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}) as unknown as typeof fetch;

const authed = createClient<Ops>(OPERATIONS, {
  fetch: fakeFetch,
  auth: { basic: { username: 'alice', password: 'pw' } },
});
const anonymous = createClient<Ops>(OPERATIONS, { fetch: fakeFetch });
await authed.getBasic();
await anonymous.getBasic();
process.stdout.write(JSON.stringify(calls));

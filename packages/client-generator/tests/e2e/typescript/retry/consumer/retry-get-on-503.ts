import { configure, listPets } from './client.ts';

let calls = 0;
const makeFetch = (failures: number) =>
  (async () => {
    calls++;
    if (calls <= failures) {
      return new Response('busy', { status: 503, headers: { 'content-type': 'text/plain' } });
    }
    return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch;

// retries: 0 (default) → one call, throws.
calls = 0;
configure({ fetch: makeFetch(1) });
let defaultThrew = false;
try {
  await listPets();
} catch {
  defaultThrew = true;
}
const defaultCalls = calls;

// retries: 3, fast backoff → recovers after 2 failures.
calls = 0;
configure({ fetch: makeFetch(2), retry: { retries: 3, retryDelay: 1 } });
await listPets();
const retryCalls = calls;

console.log(JSON.stringify({ defaultThrew, defaultCalls, retryCalls }));

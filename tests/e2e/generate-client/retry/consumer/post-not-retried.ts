import { configure, createPet } from './client.ts';

let calls = 0;
const failing = (async () => {
  calls++;
  return new Response('err', { status: 503, headers: { 'content-type': 'text/plain' } });
}) as unknown as typeof fetch;

// default predicate: POST is not idempotent → no retry.
calls = 0;
configure({ fetch: failing, retry: { retries: 3, retryDelay: 1 } });
await createPet({ body: { name: 'x' } }).catch(() => undefined);
const defaultCalls = calls;

// retryOn: () => true → POST retried.
calls = 0;
configure({ fetch: failing, retry: { retries: 3, retryDelay: 1, retryOn: () => true } });
await createPet({ body: { name: 'x' } }).catch(() => undefined);
const optInCalls = calls;

console.log(JSON.stringify({ defaultCalls, optInCalls }));

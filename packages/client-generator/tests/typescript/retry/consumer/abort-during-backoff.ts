import { configure, listPets } from './client.ts';

let calls = 0;
const failing = (async () => {
  calls++;
  return new Response('err', { status: 503, headers: { 'content-type': 'text/plain' } });
}) as unknown as typeof fetch;

configure({ fetch: failing, retry: { retries: 5, retryDelay: 50 } });
const controller = new AbortController();
setTimeout(() => controller.abort(), 10);

let aborted = false;
try {
  // listPets takes (params, init); the signal belongs on init.
  await listPets({}, { signal: controller.signal });
} catch (error) {
  aborted = (error as Error).name === 'AbortError';
}
console.log(JSON.stringify({ aborted, calls }));

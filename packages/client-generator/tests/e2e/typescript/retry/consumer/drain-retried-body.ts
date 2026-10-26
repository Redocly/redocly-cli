import { configure, listPets } from './client.ts';

let calls = 0;
let cancelled = 0;
// A 503 whose body cancellation is observable, then a 200 success.
const makeFetch = () =>
  (async () => {
    calls++;
    if (calls === 1) {
      const body = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('busy'));
          controller.close();
        },
        cancel() {
          cancelled++;
        },
      });
      return new Response(body, { status: 503, headers: { 'content-type': 'text/plain' } });
    }
    return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch;

configure({ fetch: makeFetch(), retry: { retries: 3, retryDelay: 1 } });
await listPets();

console.log(JSON.stringify({ calls, cancelled }));

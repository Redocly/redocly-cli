import { configure, use, listPets } from './client.js';

const lines: string[] = [];
let attempt = 0;
configure({
  retry: { retries: 1, retryDelay: 1, jitter: false },
  fetch: (async () => {
    attempt++;
    if (attempt === 1) throw new TypeError('fetch failed');
    if (attempt === 3) throw new TypeError('fetch failed');
    return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch,
});
use({
  onSettled: (ctx, call) => {
    const outcome = call.response ? call.response.status : 'failed';
    lines.push(ctx.operation.id + ' ' + outcome + ' ' + call.attempts);
  },
});
await listPets();
configure({ retry: { retries: 0 } });
await listPets().catch(() => undefined);
console.log(JSON.stringify({ lines }));

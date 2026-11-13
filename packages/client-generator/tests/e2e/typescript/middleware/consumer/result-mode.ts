import { configure, use, getPetById } from './client.ts';

const ran: string[] = [];
configure({
  fetch: (async () =>
    new Response('{"bad":true}', {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })) as unknown as typeof fetch,
});
use({
  onRequest: () => {
    ran.push('req');
  },
  onResponse: () => {
    ran.push('res');
  },
  onError: () => {
    ran.push('err');
    return new Error('should-not-run');
  },
});
const result = (await getPetById({ path: { id: 1 } })) as { error: unknown; data: unknown };
console.log(
  JSON.stringify({
    ran,
    hasError: result.error !== undefined,
    hasData: result.data !== undefined,
  })
);

import { configure, use, getPetById, type ApiError } from './client.ts';

configure({
  fetch: (async () =>
    new Response('{}', {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })) as unknown as typeof fetch,
});
use(
  { onError: (error: ApiError) => new Error('first:' + error.status) },
  { onError: (error) => new Error('second:' + error.message) }
);
try {
  await getPetById({ path: { id: 1 } });
  console.log(JSON.stringify({ threw: false }));
} catch (error) {
  console.log(JSON.stringify({ threw: true, message: (error as Error).message }));
}

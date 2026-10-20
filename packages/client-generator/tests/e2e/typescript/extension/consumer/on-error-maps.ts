import { configure, getPetById, type ApiError } from './client.ts';

class NotFound extends Error {}
configure({
  fetch: (async () =>
    new Response('{"detail":"nope"}', {
      status: 404,
      headers: { 'content-type': 'application/json' },
    })) as unknown as typeof fetch,
  onError: (error: ApiError) => new NotFound('mapped:' + error.status),
});

try {
  await getPetById({ path: { id: 1 } });
  console.log(JSON.stringify({ threw: false }));
} catch (error) {
  console.log(
    JSON.stringify({
      threw: true,
      name: (error as Error).constructor.name,
      message: (error as Error).message,
    })
  );
}

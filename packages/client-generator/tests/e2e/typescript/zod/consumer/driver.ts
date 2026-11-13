import { client, configure, use } from './client.js';
import { operationSchemas, zodValidation, ZodValidationError } from './client.zod.js';

const results: string[] = [];
let fetchCalls = 0;
let nextBody = '{"id":"o1"}';
let nextStatus = 200;
let lastSentBody: unknown;
configure({
  serverUrl: 'https://api.example.com',
  fetch: (async (_url: string, init?: RequestInit) => {
    fetchCalls++;
    lastSentBody = init?.body;
    return new Response(nextStatus === 204 ? null : nextBody, {
      status: nextStatus,
      headers: nextStatus === 204 ? {} : { 'content-type': 'application/json' },
    });
  }) as typeof fetch,
});

async function main() {
  // Direct schema access: the map is importable on its own.
  operationSchemas.createOrder.request.parse({ name: 'direct', quantity: 2 });

  use(zodValidation({ response: false }));

  // An invalid request throws BEFORE any network call.
  try {
    await client.createOrder({ body: { name: 'x', quantity: 0 } });
    results.push('request-not-validated');
  } catch (error) {
    results.push(
      error instanceof ZodValidationError
        ? 'request-rejected:' + error.direction + ':calls=' + fetchCalls
        : 'wrong-error:' + String(error)
    );
  }

  // With response validation off, a mismatched response resolves untouched.
  nextBody = '{"wrong":true}';
  await client.createOrder({ body: { name: 'x', quantity: 2 } });
  results.push('response-off-passes');

  // A second middleware opts response validation into throwing; the mismatch now throws.
  use(zodValidation({ request: false, response: 'throw' }));
  try {
    await client.createOrder({ body: { name: 'x', quantity: 2 } });
    results.push('response-not-validated');
  } catch (error) {
    results.push(
      error instanceof ZodValidationError
        ? 'response-rejected:' + error.direction
        : 'wrong-error:' + String(error)
    );
  }

  // A valid round trip passes both directions; a schema-less operation is untouched.
  nextBody = '{"id":"o2"}';
  const order = await client.createOrder({ body: { name: 'ok', quantity: 3 } });
  results.push('valid:' + order.id);
  nextStatus = 204;
  await client.health();
  results.push('schema-less-ok');

  // DEFAULT response mode is WARN: drift reports (with the nested failing path
  // and a value preview) but the call succeeds. configure() REPLACES middleware.
  nextStatus = 200;
  nextBody = '{"wrong":true}';
  configure({
    middleware: [
      zodValidation({
        onViolation: (error) =>
          results.push('warned:' + error.violations.map((v) => v.path).join('|')),
      }),
    ],
  });
  await client.createOrder({ body: { name: 'w', quantity: 1 } });
  results.push('warn-call-succeeded');

  // stripRequestBodies drops keys the schema does not declare from the wire body.
  nextBody = '{"id":"o3"}';
  configure({ middleware: [zodValidation({ stripRequestBodies: true, response: false })] });
  await client.createOrder({
    body: { name: 's', quantity: 1, extraneous: 'server-would-400' } as never,
  });
  results.push('stripped:' + String(lastSentBody));

  console.log(JSON.stringify(results));
}
// An unhandled rejection exits non-zero, so a driver failure fails the test.
void main();

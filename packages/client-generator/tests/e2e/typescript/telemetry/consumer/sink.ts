import { configure, use, listPets } from './client.js';
import { telemetry, flush, type SdkUsageEvent } from './client.telemetry.js';

const received: SdkUsageEvent[] = [];
configure({
  fetch: (async () =>
    new Response('[]', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })) as unknown as typeof fetch,
});
use(
  telemetry({
    sdkName: '@acme/pets-sdk',
    sdkVersion: '1.0.0',
    client: 'pets-worker/2.0.0',
    sink: (events) => {
      received.push(...events);
    },
  })
);
await listPets();
await listPets();
await flush();
console.log(JSON.stringify({ received }));

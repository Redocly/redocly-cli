import { configure, use, upload } from './client.ts';

let body: unknown;
configure({
  fetch: (async (_url: string, init: RequestInit) => {
    body = init.body;
    return new Response('', { status: 200 });
  }) as unknown as typeof fetch,
});
// A multipart op must expose the plain body object to onRequest (not pre-built FormData);
// mutating it has to be reflected in the FormData the runtime serializes afterwards.
use({
  onRequest: (ctx) => {
    (ctx.body as { orgId: string }).orgId = 'mutated';
  },
});

const file = new Blob(['hi'], { type: 'text/plain' });
await upload({ body: { file, orgId: 'org_1' } });

const formData = body as FormData;
console.log(
  JSON.stringify({ isFormData: formData instanceof FormData, orgId: formData.get('orgId') })
);

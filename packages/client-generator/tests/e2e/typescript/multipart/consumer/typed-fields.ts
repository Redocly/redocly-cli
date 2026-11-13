import { configure, upload } from './client.ts';

let body: unknown;
configure({
  fetch: (async (_url: string, init: RequestInit) => {
    body = init.body;
    return new Response('', { status: 200 });
  }) as unknown as typeof fetch,
});

const file = new Blob(['hello'], { type: 'text/plain' });
await upload({ body: { file, orgId: 'org_1', tags: ['a', 'b'], meta: { k: 'v' } } });

const formData = body as FormData;
console.log(
  JSON.stringify({
    isFormData: formData instanceof FormData,
    orgId: formData.get('orgId'),
    fileIsBlob: formData.get('file') instanceof Blob,
    tags: formData.getAll('tags'),
    meta: formData.get('meta'),
  })
);

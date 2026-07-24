// package-runtime example — same app code as the inline examples, different distribution.
//
// This client was generated with `runtime: package`: instead of embedding the engine
// (fetch, retries, middleware, auth) in `src/api/client.ts`, the generated file contains
// only THIS API's types and operation descriptors and imports the engine from
// `@redocly/client-generator`. Engine fixes and improvements arrive with
// `npm update @redocly/client-generator` — regenerate only when the API contract changes.
import { ApiError, client, configure, listMenuItems, use } from './api/client.js';

configure({ serverUrl: 'https://api.cafe.redocly.com' });

const out = document.querySelector<HTMLPreElement>('#out')!;

// Middleware runs inside the packaged engine but sees the generated OPERATIONS metadata:
// `ctx.operation.id` is the spec operationId, stable across engine updates.
const trace: string[] = [];
use({
  onRequest: (ctx) => {
    trace.push(`→ ${ctx.operation.id} — ${ctx.method} ${ctx.url}`);
  },
  onResponse: (response, ctx) => {
    document.title = `cafe — ${ctx.operation.id} ${response.status}`;
  },
});

async function main() {
  try {
    // A typed call through a generated free function…
    const menu = await listMenuItems({ limit: 3 });
    // …and one through the generated `client` instance (the same runtime underneath).
    const [first] = menu.items;
    const photo = first
      ? await client.getMenuItemPhoto({ menuItemId: first.id, params: { photoSize: 'thumbnail' } })
      : undefined;
    const photoLine =
      photo instanceof Blob
        ? `${first?.name} thumbnail: ${photo.type}, ${photo.size} bytes`
        : photo;
    out.textContent = [...trace, '', photoLine, '', JSON.stringify(menu.items, null, 2)].join('\n');
  } catch (error) {
    out.textContent =
      error instanceof ApiError
        ? `ApiError ${error.status}: ${error.statusText}`
        : `Unexpected error: ${String(error)}`;
  }
}

void main();

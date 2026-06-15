import { configure, use, listMenuItems, ApiError } from './api/client';

configure({ baseUrl: 'https://cafe.cloud.redocly.com' });

// Middleware composes cross-cutting concerns (tracing, auth refresh, logging, …).
// `onRequest` runs in registration order, `onResponse` in reverse (onion). Register
// as many as you like with `use()`; the service-class facade uses `client.use()`.
use({
  onRequest: (ctx) => {
    ctx.headers['X-Request-Id'] = crypto.randomUUID();
  },
});

const out = document.querySelector<HTMLPreElement>('#out')!;

async function main() {
  try {
    const items = await listMenuItems();
    out.textContent = JSON.stringify(items, null, 2);
  } catch (error) {
    out.textContent =
      error instanceof ApiError
        ? `ApiError ${error.status}: ${error.statusText}`
        : `Unexpected error: ${String(error)}`;
  }
}

void main();

import { configure, use, listMenuItems, ApiError } from './api/client.js';

configure({ serverUrl: 'https://api.cafe.redocly.com' });

const out = document.querySelector<HTMLPreElement>('#out')!;

// Middleware composes cross-cutting concerns (tracing, auth refresh, logging, …).
// `onRequest` runs in registration order, `onResponse` in reverse (onion); register as many as you
// like with `use()`. Here we observe the response.
//
// Heads-up: adding a *custom request header* in `onRequest` (e.g. `ctx.headers['X-Request-Id'] = …`)
// makes the browser send a CORS preflight, so the target API must list that header in its
// `Access-Control-Allow-Headers`. The public cafe demo allows only Content-Type / Authorization /
// X-API-Key, so injecting `X-Request-Id` there fails with "Failed to fetch".
use({
  onResponse: (response) => {
    document.title = `cafe — ${response.status}`;
  },
});

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

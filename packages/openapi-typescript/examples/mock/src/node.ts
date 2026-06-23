// Node counterpart to `main.ts`: the same generated `sdk` + `mock` client and the same
// `handlers`, but driven by msw/node's `setupServer`. Node has no Service Worker, so msw
// patches global `fetch` directly instead of registering `public/mockServiceWorker.js`.
import { setupServer } from 'msw/node';

import { configure, listMenuItems } from './api/client.js';
import { handlers } from './api/client.mocks.js';

const server = setupServer(...handlers);

export async function loadMockedMenu() {
  server.listen();
  configure({ baseUrl: 'https://api.cafe.redocly.com' });
  try {
    // Served by the generated mocks — no real backend required.
    return await listMenuItems();
  } finally {
    server.close();
  }
}

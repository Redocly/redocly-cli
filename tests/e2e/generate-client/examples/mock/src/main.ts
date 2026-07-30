import { setupWorker } from 'msw/browser';

import { configure, listMenuItems, ApiError } from './api/client.js';
import { handlers } from './api/client.mocks.js';

const out = document.querySelector<HTMLPreElement>('#out')!;

async function main() {
  try {
    await setupWorker(...handlers).start();
    configure({ serverUrl: 'https://api.cafe.redocly.com' });
    const response = await listMenuItems();
    out.textContent = `Mocked ${response.items.length} items:\n${JSON.stringify(
      response,
      null,
      2
    )}`;
  } catch (error) {
    out.textContent =
      error instanceof ApiError ? `ApiError ${error.status}` : `Error: ${String(error)}`;
  }
}

void main();

import { Client, ApiError } from './api/client';

const client = new Client({ baseUrl: 'https://cafe.cloud.redocly.com' });

const out = document.querySelector<HTMLPreElement>('#out')!;

async function main() {
  try {
    const items = await client.listMenuItems();
    out.textContent = JSON.stringify(items, null, 2);
  } catch (error) {
    out.textContent =
      error instanceof ApiError
        ? `ApiError ${error.status}: ${error.statusText}`
        : `Unexpected error: ${String(error)}`;
  }
}

void main();

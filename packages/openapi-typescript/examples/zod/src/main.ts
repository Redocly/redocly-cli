import { configure, listMenuItems, ApiError } from './api/client';
import { MenuItemListSchema } from './api/client.zod';

configure({ baseUrl: 'https://cafe.cloud.redocly.com' });

const out = document.querySelector<HTMLPreElement>('#out')!;

async function main() {
  try {
    const response = await listMenuItems();
    const parsed = MenuItemListSchema.parse(response);
    out.textContent = `Validated ${parsed.items.length} items:\n${JSON.stringify(parsed, null, 2)}`;
  } catch (error) {
    out.textContent =
      error instanceof ApiError ? `ApiError ${error.status}` : `Error: ${String(error)}`;
  }
}

void main();

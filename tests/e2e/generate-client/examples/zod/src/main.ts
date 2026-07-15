import { configure, listMenuItems, use, ApiError } from './api/client.js';
import { zodValidation, ZodValidationError, MenuItemListSchema } from './api/client.zod.js';

configure({ serverUrl: 'https://api.cafe.redocly.com' });
// Every request body and JSON response is now validated against the generated schemas.
use(zodValidation());

const out = document.querySelector<HTMLPreElement>('#out')!;

async function main() {
  try {
    const items = await listMenuItems(); // already validated by the middleware
    out.textContent = `Validated ${items.items.length} items:\n${JSON.stringify(items, null, 2)}`;

    // Schemas are also importable directly for one-off checks (e.g. form input, cached data).
    MenuItemListSchema.parse(items);
  } catch (error) {
    if (error instanceof ZodValidationError) {
      out.textContent = `The server broke the contract on ${error.operationId}:\n${error.message}`;
    } else {
      out.textContent =
        error instanceof ApiError ? `ApiError ${error.status}` : `Error: ${String(error)}`;
    }
  }
}

void main();

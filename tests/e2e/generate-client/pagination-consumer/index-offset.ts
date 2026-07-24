import { listMenuItems, OPERATIONS } from './api-offset.js';

// The config-convention arm: `pagination: { style: offset, … }` was passed at generate
// time, so `listMenuItems` (which structurally fits) iterates by advancing `offset` by
// each page's item count until an empty page arrives.
async function main(): Promise<void> {
  const names: string[] = [];
  for await (const item of listMenuItems.items({ params: { limit: 2 } })) {
    names.push(item.name); // compile-time: `item` is `MenuItem`
  }

  // The trailing empty page IS yielded (every page arrives before the stop check).
  const pageSizes: number[] = [];
  for await (const page of listMenuItems.pages({ params: { limit: 2 } })) {
    pageSizes.push(page.items.length);
  }

  // Precedence, pinned at compile time: the spec's `x-pagination` (cursor) beats the
  // offset convention on `listOrders` — its descriptor keeps the extension's rule.
  const listOrdersStyle: 'cursor' = OPERATIONS.listOrders.pagination.style;

  process.stdout.write(JSON.stringify({ names, pageSizes, listOrdersStyle }) + '\n');
}

main().catch((error) => {
  process.stderr.write(`UNHANDLED: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});

import { listOrders } from './api.js';

// The extension arm: `x-redoclyPagination` in the spec (no config) drives `listOrders`.
// Exercises `.items()` across three cursor pages, `.pages()` page-level access, and
// resume from a caller-provided cursor — while the caller's args are never mutated.
async function main(): Promise<void> {
  // `.items()` takes the same input as the call itself, because it IS the same function's
  // member. Every request forwards the caller's `limit` alongside the advancing cursor.
  const firstArgs = { query: { limit: 2 } };
  const ids: string[] = [];
  for await (const order of listOrders.items(firstArgs)) {
    ids.push(order.id); // compile-time: `order` is `Order`
  }
  // The iterator clones the query bag per request — the cursor never leaks into caller args.
  const firstCursorLeaked = 'cursor' in firstArgs.query;

  // `.pages()`: whole pages, typed as the raw response — sizes pin the 2+2+1 layout.
  const pageSizes: number[] = [];
  for await (const page of listOrders.pages({ query: { limit: 2 } })) {
    pageSizes.push(page.orders.length);
  }

  // Resume: a caller-provided initial cursor starts iteration at that page.
  const resumeArgs = { query: { cursor: 'c2', limit: 2 } };
  const resumedIds: string[] = [];
  for await (const order of listOrders.items(resumeArgs)) {
    resumedIds.push(order.id);
  }
  const resumeCursorAfter = resumeArgs.query.cursor;

  process.stdout.write(
    JSON.stringify({ ids, firstCursorLeaked, pageSizes, resumedIds, resumeCursorAfter }) + '\n'
  );
}

main().catch((error) => {
  process.stderr.write(`UNHANDLED: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});

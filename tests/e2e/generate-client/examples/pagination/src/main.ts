// pagination — a declared convention, verified per operation.
//
// The redocly.yaml `client.pagination` block declares ONE cursor convention for the
// whole API: advance the `cursor` query param, follow `/nextCursor` in each response,
// yield the array under `/orders`. The generator applies it only where it
// STRUCTURALLY FITS — `listOrders` has the param and the pointers resolve, so it keeps
// its one-shot call and gains `.pages()` / `.items()`; `getOrder` has no `cursor`
// param, so it stays a plain call. (Explicit declarations — `x-pagination` in the spec
// or per-operation config — that don't fit fail generation instead of being skipped.)
import { configure, listOrders } from './api/client.js';

// A canned transport so the example runs offline: two pages of orders. The first page
// carries `nextCursor`; the last page doesn't — that absence is the stop signal.
const PAGES: Record<string, unknown> = {
  '': {
    orders: [
      { id: 'ord-101', drink: 'espresso', status: 'ready' },
      { id: 'ord-102', drink: 'latte', status: 'pending' },
    ],
    nextCursor: 'p2',
  },
  p2: {
    orders: [{ id: 'ord-103', drink: 'cortado', status: 'delivered' }],
  },
};
const canned = (async (url: string) => {
  const cursor = new URL(url).searchParams.get('cursor') ?? '';
  return new Response(JSON.stringify(PAGES[cursor]), {
    headers: { 'content-type': 'application/json' },
  });
}) as unknown as typeof fetch;

configure({ fetch: canned });

// `.items()` walks every order across every page — the cursor plumbing is invisible,
// and each `order` is the statically computed element type (`Order`).
for await (const order of listOrders.items({ params: { limit: 20 } })) {
  console.log(`${order.id}: ${order.drink} (${order.status})`);
}

// `.pages()` when you need page-level access (progress reporting, batch writes).
let pageNumber = 0;
for await (const page of listOrders.pages({ params: { limit: 20 } })) {
  console.log(`page ${++pageNumber}: ${page.orders.length} orders`);
}

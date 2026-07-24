// custom-pagination — hand-written paging over the generated typed client.
//
// This API's cursor travels in the request BODY, which the built-in pagination styles
// don't cover (they only advance query parameters) — so there is no `client.pagination`
// block here and `searchOrders` has no `.pages()`/`.items()`. The escape hatch is a few
// lines: the generated call is already fully typed, so the helper (and everything it
// yields) is too. For APIs the declared styles DO fit, prefer the native iterators —
// see the sibling `pagination` example.
import { configure, searchOrders } from './api/client.js';

// A canned transport so the example runs offline: two pages keyed by the BODY cursor.
const SEARCH_PAGES: Record<string, unknown> = {
  '': {
    items: [{ id: 'ord-101', drink: 'espresso', status: 'ready' }],
    nextCursor: 's2',
  },
  s2: {
    items: [{ id: 'ord-104', drink: 'flat white', status: 'ready' }],
  },
};
const canned = (async (_url: string, init?: RequestInit) => {
  const { cursor } = JSON.parse(String(init?.body)) as { cursor?: string };
  return new Response(JSON.stringify(SEARCH_PAGES[cursor ?? '']), {
    headers: { 'content-type': 'application/json' },
  });
}) as unknown as typeof fetch;

configure({ fetch: canned });

// The whole helper: call a page, yield its items, follow the cursor until it stops.
async function* paginate<Item>(
  page: (cursor?: string) => Promise<{ items?: Item[]; nextCursor?: string }>
): AsyncGenerator<Item> {
  for (let cursor: string | undefined; ; ) {
    const { items, nextCursor } = await page(cursor);
    yield* items ?? [];
    if (!(cursor = nextCursor)) return;
  }
}

for await (const order of paginate((cursor) => searchOrders({ status: 'ready', cursor }))) {
  console.log(`search hit ${order.id}: ${order.drink}`); // `order` is `Order` — typed end to end
}

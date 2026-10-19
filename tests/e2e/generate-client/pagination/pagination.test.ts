import { generateClient } from '@redocly/client-generator';
import { readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyConsumer, expectTscPasses, runTsx } from '../helpers.js';
import { MockServer } from '../mock-server.js';

// Auto-pagination end to end, over a live server: the `x-redoclyPagination` extension arm
// (cursor style — three pages, resume, abort; body-link style with the next page's URL in
// the body) generated with NO config, and the config-convention arm (offset style, applied
// only where it structurally fits).

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, '../fixtures/pagination.yaml');
let workDir = '';

type Order = { id: string; status: string };

const ORDERS: Order[] = ['o-1', 'o-2', 'o-3', 'o-4', 'o-5'].map((id) => ({ id, status: 'open' }));

// Cursor pages (2 + 2 + 1), keyed by the cursor that requests them ('' = first page).
// The last page has no nextCursor, which is the stop signal.
const ORDER_PAGES: Record<string, { orders: Order[]; nextCursor?: string }> = {
  '': { orders: ORDERS.slice(0, 2), nextCursor: 'c2' },
  c2: { orders: ORDERS.slice(2, 4), nextCursor: 'c3' },
  c3: { orders: ORDERS.slice(4) },
};

const MENU = ['espresso', 'latte', 'mocha', 'flat white', 'cortado'].map((name, index) => ({
  id: `m-${index + 1}`,
  name,
}));

let server: MockServer;

async function runScript(script: string): Promise<{ stdout: string }> {
  const result = await runTsx(join(workDir, script), [server.url], { cwd: workDir });
  expect(result.status, `${script} stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
  return { stdout: result.stdout };
}

describe('generate-client pagination consumer', () => {
  beforeAll(async () => {
    workDir = copyConsumer(join(__dirname, 'consumer'));
    server = await MockServer.start(fixture, {
      handlers: {
        listOrders: ({ request }) => {
          const page = ORDER_PAGES[request.query.cursor ?? ''];
          if (page === undefined) {
            return { status: 404, body: { title: 'unknown cursor' } };
          }
          return { status: 200, body: page };
        },
        // Body-link pages: `next` is the next page's path and query, and null on the last page.
        listReceipts: ({ request }) => {
          const start = Number.parseInt(request.query.after ?? '0', 10);
          const limit = Number.parseInt(request.query.limit ?? '2', 10);
          const end = start + limit;
          const next = end < ORDERS.length ? `/receipts?limit=${limit}&after=${end}` : null;
          return { status: 200, body: { receipts: ORDERS.slice(start, end), next } };
        },
        // Offset pages: a request past the end gets an empty page.
        listMenuItems: ({ request }) => {
          const offset = Number.parseInt(request.query.offset ?? '0', 10);
          const limit = Number.parseInt(request.query.limit ?? '2', 10);
          return {
            status: 200,
            body: { items: MENU.slice(offset, offset + limit), total: MENU.length },
          };
        },
      },
    });
  }, 30_000);

  afterAll(async () => {
    await server.close();
    rmSync(workDir, { recursive: true, force: true });
  });

  test('generate both arms and assert the emitted pagination surface', async () => {
    const apiFile = join(workDir, 'api.ts');
    const apiOffsetFile = join(workDir, 'api-offset.ts');
    // Extension arm: NO pagination config — `x-redoclyPagination` alone drives `listOrders`.
    await generateClient({ api: fixture, output: apiFile });
    // Convention arm: an offset rule applied to every operation it structurally fits.
    await generateClient({
      api: fixture,
      output: apiOffsetFile,
      pagination: { style: 'offset', offsetParam: 'offset', limitParam: 'limit', items: '/items' },
    });

    const api = readFileSync(apiFile, 'utf-8');
    // The extension is normalized into the descriptor (param unified, stable key order).
    expect(api).toContain(
      'listOrders: { id: "listOrders", method: "GET", path: "/orders", params: [{ name: "cursor", in: "query" }, { name: "limit", in: "query" }], pagination: { style: "cursor", param: "cursor", limitParam: "limit", nextCursor: "/nextCursor", items: "/orders" } }'
    );
    // Ops declares the statically computed element type for the paginated op only.
    expect(api).toContain('item: Order;');
    expect(api).not.toContain('item: MenuItem;');
    // The other operations carry NO pagination block…
    expect(api).toContain(
      'listMenuItems: { id: "listMenuItems", method: "GET", path: "/menu", params: [{ name: "offset", in: "query" }, { name: "limit", in: "query" }] }'
    );
    expect(api).toContain(
      'getOrder: { id: "getOrder", method: "GET", path: "/orders/{orderId}", params: [{ name: "orderId", in: "path" }] }'
    );
    // …and the exported name is the client method itself, so `.pages`/`.items` ride along
    // with the same input shape as the call. No wrapper, no second argument shape.
    expect(api).toContain(
      'export const { listOrders, listMenuItems, getOrder, listReceipts } = client;'
    );
    expect(api).not.toContain('export const listOrders = Object.assign');
    expect(api).toContain(
      'pagination: { style: "body-link", limitParam: "limit", nextLink: "/next", items: "/receipts" }'
    );
    // Inline mode embeds paginate.ts (the infinite-loop guard is its fingerprint).
    expect(api).toContain('// ─── Embedded runtime');
    expect(api).toContain('Pagination did not advance');

    const offset = readFileSync(apiOffsetFile, 'utf-8');
    // The convention lands on listMenuItems (it fits)…
    expect(offset).toContain(
      'listMenuItems: { id: "listMenuItems", method: "GET", path: "/menu", params: [{ name: "offset", in: "query" }, { name: "limit", in: "query" }], pagination: { style: "offset", param: "offset", limitParam: "limit", items: "/items" } }'
    );
    expect(offset).toContain('item: MenuItem;');
    expect(offset).toContain(
      'export const { listOrders, listMenuItems, getOrder, listReceipts } = client;'
    );
    // …precedence keeps the extension's cursor rule on listOrders (not the convention)…
    expect(offset).toContain(
      'pagination: { style: "cursor", param: "cursor", limitParam: "limit", nextCursor: "/nextCursor", items: "/orders" }'
    );
    // …and getOrder (no `offset` query param) is silently skipped, not an error.
    expect(offset).toContain(
      'getOrder: { id: "getOrder", method: "GET", path: "/orders/{orderId}", params: [{ name: "orderId", in: "path" }] }'
    );
  }, 60_000);

  test('typecheck gate: both generated clients + consumer scripts, strict', () => {
    expectTscPasses(['--noEmit', '-p', workDir]);
  }, 60_000);

  test('cursor (extension arm): .items across 3 pages, .pages sizes, resume, no arg mutation', async () => {
    server.reset();
    const { stdout } = await runScript('index.ts');
    const parsed = JSON.parse(stdout.trim()) as {
      ids: string[];
      firstCursorLeaked: boolean;
      pageSizes: number[];
      resumedIds: string[];
      resumeCursorAfter: string;
    };
    // All five items, in order, across the 2+2+1 pages.
    expect(parsed.ids).toEqual(['o-1', 'o-2', 'o-3', 'o-4', 'o-5']);
    expect(parsed.pageSizes).toEqual([2, 2, 1]);
    // Resume from `cursor: 'c2'` starts at page 2; caller args stay untouched.
    expect(parsed.resumedIds).toEqual(['o-3', 'o-4', 'o-5']);
    expect(parsed.firstCursorLeaked).toBe(false);
    expect(parsed.resumeCursorAfter).toBe('c2');

    // The wire: cursor progression (none, c2, c3) with `limit` forwarded every time.
    const log = server.requests;
    expect(log.map((e) => e.url)).toEqual([
      // .items(): three pages.
      '/orders?limit=2',
      '/orders?limit=2&cursor=c2',
      '/orders?limit=2&cursor=c3',
      // .pages(): the same progression.
      '/orders?limit=2',
      '/orders?limit=2&cursor=c2',
      '/orders?limit=2&cursor=c3',
      // Resume: starts at the caller's cursor — page 1 is never requested.
      '/orders?cursor=c2&limit=2',
      '/orders?cursor=c3&limit=2',
    ]);
    expect(log.every((e) => e.method === 'GET' && e.url.includes('limit=2'))).toBe(true);
    expect(server.handlerErrors).toEqual([]);
  }, 60_000);

  test('offset (convention arm): advances by page item count, stops on the empty page', async () => {
    server.reset();
    const { stdout } = await runScript('index-offset.ts');
    const parsed = JSON.parse(stdout.trim()) as {
      names: string[];
      pageSizes: number[];
      listOrdersStyle: string;
    };
    expect(parsed.names).toEqual(['espresso', 'latte', 'mocha', 'flat white', 'cortado']);
    // The trailing empty page is yielded (pages arrive before the stop check).
    expect(parsed.pageSizes).toEqual([2, 2, 1, 0]);
    // Runtime echo of the compile-time precedence pin.
    expect(parsed.listOrdersStyle).toBe('cursor');

    // offset=0,2,4 then the empty probe at 5 — for the .items() and .pages() walks.
    const log = server.requests;
    expect(log.map((e) => e.url)).toEqual([
      '/menu?limit=2&offset=0',
      '/menu?limit=2&offset=2',
      '/menu?limit=2&offset=4',
      '/menu?limit=2&offset=5',
      '/menu?limit=2&offset=0',
      '/menu?limit=2&offset=2',
      '/menu?limit=2&offset=4',
      '/menu?limit=2&offset=5',
    ]);
    expect(server.handlerErrors).toEqual([]);
  }, 60_000);

  test('body-link (extension arm): follows the URL in the body until it is null', async () => {
    server.reset();
    const { stdout } = await runScript('index-link.ts');
    const parsed = JSON.parse(stdout.trim()) as { ids: string[] };
    expect(parsed.ids).toEqual(['o-1', 'o-2', 'o-3', 'o-4', 'o-5']);

    // The body's `next` query replaces the caller's values key by key: `limit` once, never twice.
    const log = server.requests;
    expect(log.map((e) => e.url)).toEqual([
      '/receipts?limit=2',
      '/receipts?limit=2&after=2',
      '/receipts?limit=2&after=4',
    ]);
    expect(server.handlerErrors).toEqual([]);
  }, 60_000);

  test('abort mid-iteration: the forwarded signal rejects the next page fetch', async () => {
    server.reset();
    const { stdout } = await runScript('index-abort.ts');
    const parsed = JSON.parse(stdout.trim()) as { received: number; error: string | null };
    // The first page (2 items) drains from memory, then the page-2 fetch aborts.
    expect(parsed.received).toBe(2);
    expect(parsed.error).toBe('AbortError');

    const log = server.requests;
    const pageRequests = log.filter((e) => e.url.startsWith('/orders'));
    expect(pageRequests.length).toBeGreaterThanOrEqual(1);
    expect(pageRequests.length).toBeLessThanOrEqual(2);
    expect(server.handlerErrors).toEqual([]);
  }, 60_000);
});

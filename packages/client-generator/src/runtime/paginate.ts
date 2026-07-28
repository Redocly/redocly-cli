import type { OperationArgs } from './create-client.js';
import type { PaginationSpec, QueryValue, RequestOptions } from './types.js';

/**
 * Auto-pagination (capability module — wired into `createClient`, dispatched by the
 * method's `.pages()`/`.items()`): walk an operation's pages by advancing the descriptor's
 * `param` query parameter, per its `style`. The caller's args are never mutated — each
 * request gets a fresh `params` clone — and `init` is forwarded to every call.
 *
 * Iteration is error-mode-agnostic: `call` always resolves to the RAW page (on a
 * result-mode client the attachment unwraps the envelope first), so a failed page
 * aborts iteration by throwing `ApiError`, even on result-mode clients; the `onError`
 * middleware hook (throw-mode-only) is not invoked.
 */

/**
 * Resolve an RFC 6901 JSON pointer (`~1` → `/`, `~0` → `~`) against a value.
 * The empty pointer is the whole document; anything else must start with `/`.
 * Returns `undefined` on any miss (bad token, absent key, non-object step) — never throws.
 */
export function resolvePointer(value: unknown, pointer: string): unknown {
  if (pointer === '') return value;
  if (!pointer.startsWith('/')) return undefined;
  let current = value;
  for (const token of pointer.slice(1).split('/')) {
    const key = token.replaceAll('~1', '/').replaceAll('~0', '~');
    if (Array.isArray(current)) {
      if (!/^(0|[1-9]\d*)$/.test(key)) return undefined;
      current = current[Number(key)];
    } else if (Object(current) === current && key in (current as object)) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return current;
}

/**
 * Iterate an operation's full page results. Every page is yielded before the stop
 * condition is evaluated, so the last page always arrives. Cursor style resumes from a
 * caller-provided `params[spec.param]`, stops when the optional `hasMore` pointer
 * resolves to `false` or when `nextCursor` resolves to `undefined`/`null`/`''`, and
 * throws if the next cursor is not a string or number, or
 * if the same cursor comes back twice in a row (infinite-loop guards). Offset/page
 * styles advance by item count / by one and stop when
 * the `items` pointer misses or the array is empty.
 */
export async function* pages<TPage>(
  call: (args?: OperationArgs, init?: RequestOptions) => Promise<TPage>,
  spec: PaginationSpec,
  args: OperationArgs = {},
  init?: RequestOptions
): AsyncGenerator<TPage> {
  if (spec.style === 'cursor') {
    let cursor: unknown = args.params?.[spec.param];
    while (true) {
      const params = { ...args.params };
      if (cursor !== undefined) params[spec.param] = cursor as QueryValue;
      const page = await call({ ...args, params }, init);
      yield page;
      // Connection-style APIs keep a non-null cursor on the last page and signal the
      // end via a boolean flag — honor it before the cursor check to skip the
      // follow-up empty request. Strictly `false`: a missing pointer falls through.
      if (spec.hasMore !== undefined && resolvePointer(page, spec.hasMore) === false) return;
      const next = resolvePointer(page, spec.nextCursor);
      if (next === undefined || next === null || next === '') return;
      if (typeof next !== 'string' && typeof next !== 'number') {
        // A fresh non-scalar cursor never compares equal, so without this guard a lying
        // server would slip past the did-not-advance check into an infinite loop.
        throw new Error(`Pagination cursor at ${spec.nextCursor} is not a string or number`);
      }
      if (next === cursor) {
        throw new Error('Pagination did not advance: operation returned the same cursor twice');
      }
      cursor = next;
    }
  } else if (spec.style === 'link') {
    // `link` iteration needs the response's `Link` header, which the parsed-page `call`
    // cannot carry — the client wires those operations to `pagesByLink` instead.
    throw new Error('link-style pagination iterates via pagesByLink');
  } else {
    // Coerce the starting position to a number: a caller may pass `params[spec.param]` as a
    // string (common from URL/form input), and `+=` on a string would concatenate.
    const start = args.params?.[spec.param];
    const fallback = spec.style === 'page' ? 1 : 0;
    let position = start === undefined || Number.isNaN(Number(start)) ? fallback : Number(start);
    while (true) {
      const page = await call(
        { ...args, params: { ...args.params, [spec.param]: position } },
        init
      );
      yield page;
      const pageItems = resolvePointer(page, spec.items);
      if (!Array.isArray(pageItems) || pageItems.length === 0) return;
      position += spec.style === 'page' ? 1 : pageItems.length;
    }
  }
}

/**
 * Iterate the operation's individual items: each page's `items` pointer, flattened.
 * A cursor-style page whose pointer misses yields nothing but pagination continues;
 * for offset/page styles a miss has already stopped `pages`.
 */
export async function* items<TItem>(
  call: (args?: OperationArgs, init?: RequestOptions) => Promise<unknown>,
  spec: PaginationSpec,
  args?: OperationArgs,
  init?: RequestOptions
): AsyncGenerator<TItem> {
  for await (const page of pages(call, spec, args, init)) {
    const pageItems = resolvePointer(page, spec.items);
    if (Array.isArray(pageItems)) yield* pageItems as TItem[];
  }
}

/**
 * The per-page call the `link`-style iterators drive: the parsed page plus the raw
 * `Link` header and the page's own URL (for resolving a relative `next` target).
 */
export type LinkPageCall = (
  args?: OperationArgs,
  init?: RequestOptions
) => Promise<{ page: unknown; linkHeader: string | null; url: string }>;

/** The `rel="next"` target of an RFC 8288 `Link` header, or `undefined` when absent. */
export function linkNext(header: string | null): string | undefined {
  if (header === null) return undefined;
  // Entries are `<url>; rel="next"`, comma-separated; the URL is inside `<>`, so split
  // on commas that precede a `<` and a comma inside a target cannot break an entry.
  for (const entry of header.split(/,\s*(?=<)/)) {
    const target = /^\s*<([^>]*)>(.*)$/.exec(entry);
    if (!target) continue;
    const rel = /;\s*rel\s*=\s*"?([^";]+)"?/i.exec(target[2]);
    // `rel` may carry several space-separated relation types (RFC 8288 §3.3).
    if (rel && rel[1].split(/\s+/).includes('next')) return target[1];
  }
  return undefined;
}

/**
 * Iterate a `link`-style operation's pages: follow the `Link` header's `rel="next"`
 * target by merging ITS query params into the next call — every page goes through the
 * same declared endpoint, so auth, middleware, and `serverUrl` handling apply
 * unchanged, and credentials can never be handed to a cross-origin `next` URL.
 * Stops when no `rel="next"` is present; throws when the link does not advance
 * (the same target twice, or a self-link — an infinite-loop guard).
 */
export async function* pagesByLink<TPage>(
  call: LinkPageCall,
  args: OperationArgs = {},
  init?: RequestOptions
): AsyncGenerator<TPage> {
  let params = args.params;
  let previous: string | undefined;
  while (true) {
    const { page, linkHeader, url } = await call({ ...args, params }, init);
    yield page as TPage;
    const target = linkNext(linkHeader);
    if (target === undefined) return;
    // A relative target resolves against the page's own URL (RFC 8288 §3.1).
    const next = new URL(target, url).toString();
    if (next === previous || next === url) {
      throw new Error('Pagination did not advance: the Link rel="next" target repeats');
    }
    previous = next;
    const linkParams: Record<string, string> = {};
    for (const [key, value] of new URL(next).searchParams) linkParams[key] = value;
    params = { ...args.params, ...linkParams };
  }
}

/** Iterate a `link`-style operation's individual items: each page's `items` pointer, flattened. */
export async function* itemsByLink<TItem>(
  call: LinkPageCall,
  spec: PaginationSpec,
  args?: OperationArgs,
  init?: RequestOptions
): AsyncGenerator<TItem> {
  for await (const page of pagesByLink(call, args, init)) {
    const pageItems = resolvePointer(page, spec.items);
    if (Array.isArray(pageItems)) yield* pageItems as TItem[];
  }
}

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
 * caller-provided `params[spec.param]`, stops when `nextCursor` resolves to
 * `undefined`/`null`/`''`, and throws if the next cursor is not a string or number, or
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
      const next = resolvePointer(page, spec.nextCursor!);
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

import { items, pages, resolvePointer } from '../paginate.js';
import type { PaginationSpec, RequestOptions } from '../types.js';

const CURSOR: PaginationSpec = {
  style: 'cursor',
  param: 'cursor',
  nextCursor: '/nextCursor',
  items: '/orders',
};
const OFFSET: PaginationSpec = { style: 'offset', param: 'offset', items: '/orders' };
const PAGE: PaginationSpec = { style: 'page', param: 'page', items: '/orders' };

/** A fetch-free call stub: replies from `data` by call index, recording every args/init. */
function stub(data: unknown[]) {
  const calls: Array<{ args?: Record<string, unknown>; init?: RequestOptions }> = [];
  const call = async (args?: Record<string, unknown>, init?: RequestOptions) => {
    calls.push({ args, init });
    return data[calls.length - 1];
  };
  const sentParams = (name: string) =>
    calls.map((c) => (c.args?.params as Record<string, unknown> | undefined)?.[name]);
  return { calls, call, sentParams };
}

async function collect<T>(gen: AsyncGenerator<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const value of gen) out.push(value);
  return out;
}

describe('resolvePointer', () => {
  const doc = {
    'menu/items': { 'size~tall': 'latte' },
    orders: [{ id: 'o1' }, { id: 'o2' }],
  };

  it('walks objects and arrays, unescaping ~1 then ~0', () => {
    expect(resolvePointer(doc, '/menu~1items/size~0tall')).toBe('latte');
    expect(resolvePointer(doc, '/orders/1/id')).toBe('o2');
  });

  it('returns the whole document for the empty pointer', () => {
    expect(resolvePointer(doc, '')).toBe(doc);
  });

  it('requires a leading slash', () => {
    expect(resolvePointer(doc, 'orders')).toBeUndefined();
  });

  it('returns undefined on any miss instead of throwing', () => {
    expect(resolvePointer(doc, '/missing')).toBeUndefined();
    expect(resolvePointer(doc, '/orders/9/id')).toBeUndefined();
    // Array tokens must be canonical indices: no leading zeros, no '-', no words.
    expect(resolvePointer(doc, '/orders/01')).toBeUndefined();
    expect(resolvePointer(doc, '/orders/-')).toBeUndefined();
    expect(resolvePointer(doc, '/orders/first')).toBeUndefined();
  });

  it('returns undefined when traversing into a non-object', () => {
    expect(resolvePointer('espresso', '/length')).toBeUndefined();
    expect(resolvePointer(null, '/orders')).toBeUndefined();
    expect(resolvePointer({ total: 42 }, '/total/amount')).toBeUndefined();
  });
});

describe('pages — cursor style', () => {
  it('follows nextCursor across pages and always yields the last page', async () => {
    const data = [
      { orders: [{ id: 'o1' }, { id: 'o2' }], nextCursor: 'c2' },
      { orders: [{ id: 'o3' }], nextCursor: 'c3' },
      { orders: [{ id: 'o4' }] }, // no nextCursor — final page, still yielded
    ];
    const { call, sentParams } = stub(data);
    expect(await collect(pages(call, CURSOR))).toEqual(data);
    expect(sentParams('cursor')).toEqual([undefined, 'c2', 'c3']);
  });

  it.each([null, ''])('stops when the next cursor resolves to %j', async (last) => {
    const data = [
      { orders: [{ id: 'o1' }], nextCursor: 'c2' },
      { orders: [{ id: 'o2' }], nextCursor: last },
    ];
    const { call, calls } = stub(data);
    expect(await collect(pages(call, CURSOR))).toEqual(data);
    expect(calls).toHaveLength(2);
  });

  it('resumes from a caller-provided cursor, preserving other params', async () => {
    const data = [{ orders: [{ id: 'o3' }] }];
    const { call, calls } = stub(data);
    await collect(pages(call, CURSOR, { params: { cursor: 'c2', limit: 5 } }));
    expect(calls[0].args?.params).toEqual({ cursor: 'c2', limit: 5 });
  });

  it('advances through numeric cursors end-to-end', async () => {
    const data = [
      { orders: [{ id: 'o1' }], nextCursor: 2 },
      { orders: [{ id: 'o2' }], nextCursor: 3 },
      { orders: [{ id: 'o3' }] },
    ];
    const { call, sentParams } = stub(data);
    expect(await collect(pages(call, CURSOR))).toEqual(data);
    expect(sentParams('cursor')).toEqual([undefined, 2, 3]);
  });

  it('throws when the next cursor is neither a string nor a number (hostile server)', async () => {
    // A fresh object every page would never compare equal — without this guard the
    // did-not-advance check could not catch the infinite loop.
    const data = [{ orders: [{ id: 'o1' }], nextCursor: { token: 'c2' } }];
    const { call } = stub(data);
    await expect(collect(pages(call, CURSOR))).rejects.toThrow(
      'Pagination cursor at /nextCursor is not a string or number'
    );
  });

  it('throws when the operation returns the same cursor twice in a row', async () => {
    const data = [
      { orders: [{ id: 'o1' }], nextCursor: 'c2' },
      { orders: [{ id: 'o1' }], nextCursor: 'c2' },
    ];
    const { call } = stub(data);
    await expect(collect(pages(call, CURSOR))).rejects.toThrow(
      'Pagination did not advance: operation returned the same cursor twice'
    );
  });

  it('never mutates the caller args; each request gets a fresh params clone', async () => {
    const data = [{ orders: [{ id: 'o1' }], nextCursor: 'c2' }, { orders: [] }];
    const args = { params: { limit: 2 }, headers: { 'X-Trace': '1' } };
    const snapshot = structuredClone(args);
    const { call, calls } = stub(data);
    await collect(pages(call, CURSOR, args));
    expect(args).toEqual(snapshot);
    expect(calls[0].args?.params).not.toBe(args.params);
    expect(calls[1].args?.params).not.toBe(calls[0].args?.params);
  });

  it('forwards the same init (incl. AbortSignal) to every call', async () => {
    const data = [{ orders: [], nextCursor: 'c2' }, { orders: [] }];
    const init: RequestOptions = { signal: new AbortController().signal };
    const { call, calls } = stub(data);
    await collect(pages(call, CURSOR, {}, init));
    expect(calls).toHaveLength(2);
    for (const c of calls) expect(c.init).toBe(init);
  });
});

describe('pages — offset style', () => {
  it('starts at 0 and advances by each page item count; an empty page stops after being yielded', async () => {
    const data = [
      { orders: ['a', 'b'] },
      { orders: ['c', 'd'] },
      { orders: ['e'] },
      { orders: [] },
    ];
    const { call, sentParams } = stub(data);
    expect(await collect(pages(call, OFFSET))).toEqual(data);
    expect(sentParams('offset')).toEqual([0, 2, 4, 5]);
  });

  it('starts at the caller offset when provided', async () => {
    const data = [{ orders: ['k'] }, { orders: [] }];
    const { call, sentParams } = stub(data);
    await collect(pages(call, OFFSET, { params: { offset: 10 } }));
    expect(sentParams('offset')).toEqual([10, 11]);
  });

  it('coerces a string offset to a number so advancing adds instead of concatenating', async () => {
    const data = [{ orders: ['k', 'm'] }, { orders: [] }];
    const { call, sentParams } = stub(data);
    // A string offset (common from URL/form input): `'10' + 2` would be `'102'` without coercion.
    await collect(pages(call, OFFSET, { params: { offset: '10' } }));
    expect(sentParams('offset')).toEqual([10, 12]);
  });

  it('falls back to the default start when the offset param is not a number', async () => {
    const data = [{ orders: ['k'] }, { orders: [] }];
    const { call, sentParams } = stub(data);
    await collect(pages(call, OFFSET, { params: { offset: 'not-a-number' } }));
    expect(sentParams('offset')).toEqual([0, 1]);
  });

  it('stops when the items pointer misses', async () => {
    const data = [{ total: 0 }];
    const { call, calls } = stub(data);
    expect(await collect(pages(call, OFFSET))).toEqual(data);
    expect(calls).toHaveLength(1);
  });
});

describe('pages — page style', () => {
  it('starts at 1 and increments by 1 until an empty page', async () => {
    const data = [{ orders: ['a', 'b'] }, { orders: ['c'] }, { orders: [] }];
    const { call, sentParams } = stub(data);
    expect(await collect(pages(call, PAGE))).toEqual(data);
    expect(sentParams('page')).toEqual([1, 2, 3]);
  });

  it('starts at the caller page number when provided', async () => {
    const data = [{ orders: ['x'] }, { orders: [] }];
    const { call, sentParams } = stub(data);
    await collect(pages(call, PAGE, { params: { page: 5 } }));
    expect(sentParams('page')).toEqual([5, 6]);
  });
});

describe('items', () => {
  it('flattens each page through the items pointer', async () => {
    const data = [
      { orders: [{ id: 'o1' }, { id: 'o2' }], nextCursor: 'c2' },
      { orders: [{ id: 'o3' }] },
    ];
    const { call } = stub(data);
    expect(await collect(items(call, CURSOR))).toEqual([{ id: 'o1' }, { id: 'o2' }, { id: 'o3' }]);
  });

  it('cursor style: a page whose items pointer misses yields nothing but pagination continues', async () => {
    const data = [
      { orders: [{ id: 'o1' }], nextCursor: 'c2' },
      { nextCursor: 'c3' }, // no items array — skipped, cursor keeps advancing
      { orders: [{ id: 'o2' }] },
    ];
    const { call, calls } = stub(data);
    expect(await collect(items(call, CURSOR))).toEqual([{ id: 'o1' }, { id: 'o2' }]);
    expect(calls).toHaveLength(3);
  });

  it('offset style: a missing items pointer stops the iteration', async () => {
    const data = [{ orders: ['a'] }, { note: 'sold out' }];
    const { call, calls } = stub(data);
    expect(await collect(items(call, OFFSET))).toEqual(['a']);
    expect(calls).toHaveLength(2);
  });

  it('forwards args and init to the underlying pages', async () => {
    const data = [{ orders: ['a'] }, { orders: [] }];
    const init: RequestOptions = { headers: { 'X-Trace': '1' } };
    const { call, calls, sentParams } = stub(data);
    await collect(items(call, PAGE, { params: { limit: 1 } }, init));
    expect(sentParams('limit')).toEqual([1, 1]);
    for (const c of calls) expect(c.init).toBe(init);
  });
});

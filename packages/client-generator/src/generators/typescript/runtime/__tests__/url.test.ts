import { buildUrl, encodeReserved, substitutePath } from '../url.js';

describe('substitutePath', () => {
  it('substitutes and encodes path params', () => {
    expect(substitutePath('/orders/{orderId}/items/{itemId}', { orderId: 'a/b', itemId: 42 })).toBe(
      '/orders/a%2Fb/items/42'
    );
  });

  it('throws on a missing param', () => {
    expect(() => substitutePath('/orders/{orderId}', {})).toThrow(/orderId/);
  });
});

describe('encodeReserved', () => {
  it('keeps the RFC-3986 reserved set literal while encoding the rest', () => {
    expect(encodeReserved("a/b?c#d[e]@f!g$h&i'j(k)l*m+n,o;p=q r")).toBe(
      "a/b?c#d[e]@f!g$h&i'j(k)l*m+n,o;p=q%20r"
    );
  });
});

describe('buildUrl', () => {
  it('trims any run of trailing slashes in linear time', () => {
    expect(buildUrl('https://x///', '/p')).toBe('https://x/p');
    // Adversarial many-slash input must not blow up (the old regex was quadratic).
    const start = Date.now();
    expect(buildUrl('https://x' + '/'.repeat(100_000), '/p')).toBe('https://x/p');
    expect(Date.now() - start).toBeLessThan(1_000);
  });

  const base = 'https://api.example.com/';

  it('trims trailing slashes and appends the path; no query → no ?', () => {
    expect(buildUrl(base, '/menu')).toBe('https://api.example.com/menu');
    expect(buildUrl(base, '/menu', {})).toBe('https://api.example.com/menu');
  });

  it('default form+explode repeats arrays, skips null/undefined (top level and in arrays)', () => {
    expect(
      buildUrl(base, '/m', {
        tags: ['a', 'b', null, undefined],
        skip: undefined,
        gone: null,
        limit: 5,
      })
    ).toBe('https://api.example.com/m?tags=a&tags=b&limit=5');
  });

  it('object values without a spec serialize as deepObject brackets, skipping empty entries', () => {
    expect(buildUrl(base, '/m', { f: { color: 'red', size: 'L', none: null } })).toBe(
      'https://api.example.com/m?f%5Bcolor%5D=red&f%5Bsize%5D=L'
    );
  });

  it('form explode=true with allowReserved emits raw pairs; without it appends params', () => {
    expect(
      buildUrl(
        base,
        '/m',
        { t: ['a/b', 'c'] },
        { t: { style: 'form', explode: true, allowReserved: true } }
      )
    ).toBe('https://api.example.com/m?t=a/b&t=c');
    expect(buildUrl(base, '/m', { t: ['a b'] }, { t: { style: 'form', explode: true } })).toBe(
      'https://api.example.com/m?t=a+b'
    );
  });

  it('delimited styles use LITERAL delimiters with encoded values', () => {
    expect(buildUrl(base, '/m', { t: ['a', 'b'] }, { t: { style: 'form', explode: false } })).toBe(
      'https://api.example.com/m?t=a,b'
    );
    expect(
      buildUrl(base, '/m', { t: ['a b', 'c'] }, { t: { style: 'pipeDelimited', explode: false } })
    ).toBe('https://api.example.com/m?t=a%20b|c');
    expect(
      buildUrl(base, '/m', { t: ['a', 'c'] }, { t: { style: 'spaceDelimited', explode: false } })
    ).toBe('https://api.example.com/m?t=a%20c');
    expect(
      buildUrl(
        base,
        '/m',
        { t: ['a/b'] },
        { t: { style: 'pipeDelimited', explode: false, allowReserved: true } }
      )
    ).toBe('https://api.example.com/m?t=a/b');
  });

  it('objects with a spec serialize as brackets (allowReserved switches to raw pairs)', () => {
    expect(
      buildUrl(
        base,
        '/m',
        { f: { a: '1', skip: null } },
        { f: { style: 'deepObject', explode: true } }
      )
    ).toBe('https://api.example.com/m?f%5Ba%5D=1');
    expect(
      buildUrl(
        base,
        '/m',
        { f: { a: 'x/y' } },
        { f: { style: 'deepObject', explode: true, allowReserved: true } }
      )
    ).toBe('https://api.example.com/m?f[a]=x/y');
  });

  it('scalars with a spec: allowReserved raw vs encoded append; skipped when null', () => {
    expect(
      buildUrl(
        base,
        '/m',
        { filter: 'a/b' },
        { filter: { style: 'form', explode: true, allowReserved: true } }
      )
    ).toBe('https://api.example.com/m?filter=a/b');
    expect(
      buildUrl(base, '/m', { filter: 'a b' }, { filter: { style: 'form', explode: true } })
    ).toBe('https://api.example.com/m?filter=a+b');
    expect(
      buildUrl(base, '/m', { filter: null }, { filter: { style: 'form', explode: true } })
    ).toBe('https://api.example.com/m');
  });
});

import { resolveAuth } from '../auth.js';

const bearer = [{ scheme: 's', kind: 'bearer' }] as const;

describe('resolveAuth', () => {
  it('applies bearer (incl. async TokenProvider), basic, and apiKey in header/query/cookie', async () => {
    expect((await resolveAuth(bearer, { auth: { bearer: 't1' } })).headers.Authorization).toBe(
      'Bearer t1'
    );
    expect(
      (await resolveAuth(bearer, { auth: { bearer: async () => 't2' } })).headers.Authorization
    ).toBe('Bearer t2');

    const basic = await resolveAuth([{ scheme: 'b', kind: 'basic' }], {
      auth: { basic: { username: 'u', password: 'p' } },
    });
    expect(basic.headers.Authorization).toBe(`Basic ${btoa('u:p')}`);

    const key = await resolveAuth(
      [
        { scheme: 'h', kind: 'apiKey', name: 'X-Key', in: 'header' },
        { scheme: 'q', kind: 'apiKey', name: 'k', in: 'query' },
        { scheme: 'c', kind: 'apiKey', name: 'sid', in: 'cookie' },
        { scheme: 'c2', kind: 'apiKey', name: 'ses', in: 'cookie' },
      ],
      { auth: { apiKey: { h: 'H', q: 'Q', c: 'C', c2: 'D' } } }
    );
    expect(key.headers['X-Key']).toBe('H');
    expect(key.query.k).toBe('Q');
    expect(key.headers.Cookie).toBe('sid=C; ses=D');
  });

  it('percent-encodes cookie credentials so reserved characters cannot break the header', async () => {
    const key = await resolveAuth([{ scheme: 'c', kind: 'apiKey', name: 'sid', in: 'cookie' }], {
      auth: { apiKey: { c: 'a b;c=d' } },
    });
    expect(key.headers.Cookie).toBe('sid=a%20b%3Bc%3Dd');
  });

  it('skips schemes with no configured credential', async () => {
    const out = await resolveAuth(
      [
        ...bearer,
        { scheme: 'b', kind: 'basic' },
        { scheme: 'k', kind: 'apiKey', name: 'X', in: 'header' },
      ],
      {}
    );
    expect(out.headers).toEqual({});
    expect(out.query).toEqual({});
  });
});

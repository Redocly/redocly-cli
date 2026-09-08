import { resolveAuth } from '../auth.js';

const bearer = [[{ scheme: 's', kind: 'bearer' }]] as const;

describe('resolveAuth', () => {
  it('applies bearer (incl. async TokenProvider), basic, and apiKey in header/query/cookie', async () => {
    expect((await resolveAuth(bearer, { auth: { bearer: 't1' } })).headers.Authorization).toBe(
      'Bearer t1'
    );
    expect(
      (await resolveAuth(bearer, { auth: { bearer: async () => 't2' } })).headers.Authorization
    ).toBe('Bearer t2');

    const basic = await resolveAuth([[{ scheme: 'b', kind: 'basic' }]], {
      auth: { basic: { username: 'u', password: 'p' } },
    });
    expect(basic.headers.Authorization).toBe(`Basic ${btoa('u:p')}`);

    const key = await resolveAuth(
      [
        [
          { scheme: 'h', kind: 'apiKey', name: 'X-Key', in: 'header' },
          { scheme: 'q', kind: 'apiKey', name: 'k', in: 'query' },
          { scheme: 'c', kind: 'apiKey', name: 'sid', in: 'cookie' },
          { scheme: 'c2', kind: 'apiKey', name: 'ses', in: 'cookie' },
        ],
      ],
      { auth: { apiKey: { h: 'H', q: 'Q', c: 'C', c2: 'D' } } }
    );
    expect(key.headers['X-Key']).toBe('H');
    expect(key.query.k).toBe('Q');
    expect(key.headers.Cookie).toBe('sid=C; ses=D');
  });

  it('applies the first OR-alternative whose credentials are all configured', async () => {
    const bearerOrApiKey = [
      [{ scheme: 's', kind: 'bearer' }],
      [{ scheme: 'k', kind: 'apiKey', name: 'X-Key', in: 'header' }],
    ] as const;

    // Only the SECOND alternative is configured: it must be applied, not skipped.
    const keyOnly = await resolveAuth(bearerOrApiKey, { auth: { apiKey: { k: 'K' } } });
    expect(keyOnly.headers['X-Key']).toBe('K');
    expect(keyOnly.headers.Authorization).toBeUndefined();

    // Both configured: the first alternative wins, never a union across alternatives.
    const both = await resolveAuth(bearerOrApiKey, {
      auth: { bearer: 't', apiKey: { k: 'K' } },
    });
    expect(both.headers.Authorization).toBe('Bearer t');
    expect(both.headers['X-Key']).toBeUndefined();
  });

  it('encodes non-Latin-1 basic credentials (bare btoa would throw InvalidCharacterError)', async () => {
    const basic = await resolveAuth([[{ scheme: 'b', kind: 'basic' }]], {
      auth: { basic: { username: 'usér', password: 'på§s' } },
    });
    expect(basic.headers.Authorization).toBe(
      `Basic ${Buffer.from('usér:på§s', 'utf-8').toString('base64')}`
    );
  });

  it('percent-encodes cookie credentials so reserved characters cannot break the header', async () => {
    const key = await resolveAuth([[{ scheme: 'c', kind: 'apiKey', name: 'sid', in: 'cookie' }]], {
      auth: { apiKey: { c: 'a b;c=d' } },
    });
    expect(key.headers.Cookie).toBe('sid=a%20b%3Bc%3Dd');
  });

  it('skips schemes with no configured credential', async () => {
    const out = await resolveAuth(
      [
        [
          ...bearer[0],
          { scheme: 'b', kind: 'basic' },
          { scheme: 'k', kind: 'apiKey', name: 'X', in: 'header' },
        ],
      ],
      {}
    );
    expect(out.headers).toEqual({});
    expect(out.query).toEqual({});
  });
});

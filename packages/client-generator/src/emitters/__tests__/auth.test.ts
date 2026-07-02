import type { SecuritySchemeModel } from '../../intermediate-representation/model.js';
import { authSetterNames, authTypeNames, renderAuth } from '../auth.js';

/** A spec exercising all five injectable kinds at once. */
const allKinds: SecuritySchemeModel[] = [
  { kind: 'bearer', key: 'OAuth2' },
  { kind: 'basic', key: 'Basic' },
  { kind: 'apiKeyHeader', key: 'HeaderKey', headerName: 'X-API-Key' },
  { kind: 'apiKeyQuery', key: 'QueryKey', paramName: 'api_key' },
  { kind: 'apiKeyCookie', key: 'CookieKey', cookieName: 'sid' },
];

describe('renderAuth', () => {
  it('returns "" when there are no schemes', () => {
    expect(renderAuth([], true, true)).toBe('');
    expect(renderAuth([], false, false)).toBe('');
  });

  describe('TokenProvider type', () => {
    it('emits + exports TokenProvider when any bearer/apiKey scheme exists', () => {
      const out = renderAuth([{ kind: 'bearer', key: 'OAuth2' }], false, false);
      expect(out).toContain(
        'export type TokenProvider = string | (() => string | Promise<string>);'
      );
    });

    it('emits TokenProvider for an apiKey-only scheme set', () => {
      const out = renderAuth(
        [{ kind: 'apiKeyQuery', key: 'k', paramName: 'api_key' }],
        false,
        false
      );
      expect(out).toContain('export type TokenProvider =');
    });

    it('does NOT emit TokenProvider for a basic-only scheme set', () => {
      const out = renderAuth([{ kind: 'basic', key: 'Basic' }], false, false);
      expect(out).not.toContain('TokenProvider');
    });
  });

  describe('AuthCredentials type (per-instance config.auth)', () => {
    it('emits a field per declared scheme kind', () => {
      const out = renderAuth(allKinds, true, true);
      expect(out).toContain('export type AuthCredentials = {');
      expect(out).toContain('bearer?: TokenProvider;');
      expect(out).toContain('basic?: {');
      expect(out).toContain('username: string;');
      expect(out).toContain('password: string;');
      expect(out).toContain('apiKey?: Record<string, TokenProvider>;');
    });

    it('a basic-only set has only the basic field (no TokenProvider reference)', () => {
      const out = renderAuth([{ kind: 'basic', key: 'Basic' }], true, false);
      expect(out).toContain('export type AuthCredentials = {');
      expect(out).toContain('basic?: {');
      expect(out).not.toContain('bearer?:');
      expect(out).not.toContain('apiKey?:');
      expect(out).not.toContain('TokenProvider');
    });

    it('is emitted whenever schemes exist, even with no authed operation', () => {
      const out = renderAuth([{ kind: 'bearer', key: 'OAuth2' }], false, false);
      expect(out).toContain('export type AuthCredentials = {');
    });
  });

  describe('bearer', () => {
    it('emits one shared slot + setBearer for bearer schemes', () => {
      const out = renderAuth(
        [
          { kind: 'bearer', key: 'OAuth2' },
          { kind: 'bearer', key: 'BearerHttp' },
        ],
        false,
        false
      );
      expect(out).toContain('let __bearerToken: TokenProvider | null = null;');
      expect(out.match(/let __bearerToken/g)).toHaveLength(1);
      expect(out).toContain('export function setBearer(token: TokenProvider | null): void {');
      expect(out).toContain('__bearerToken = token;');
      expect(out.match(/export function setBearer\(/g)).toHaveLength(1);
    });
  });

  describe('basic', () => {
    it('emits one shared __basicAuth slot + setBasicAuth storing btoa(user:pass)', () => {
      const out = renderAuth(
        [
          { kind: 'basic', key: 'Basic' },
          { kind: 'basic', key: 'Basic2' },
        ],
        false,
        false
      );
      expect(out).toContain('let __basicAuth: string | null = null;');
      expect(out.match(/let __basicAuth/g)).toHaveLength(1);
      expect(out).toContain(
        'export function setBasicAuth(username: string, password: string): void {'
      );
      expect(out).toContain('__basicAuth = btoa(`${username}:${password}`);');
      expect(out.match(/export function setBasicAuth\(/g)).toHaveLength(1);
    });
  });

  describe('apiKey setters', () => {
    it('emits a slot + setApiKey for a sole apiKey scheme (any in)', () => {
      const out = renderAuth(
        [{ kind: 'apiKeyQuery', key: 'QueryKey', paramName: 'api_key' }],
        false,
        false
      );
      expect(out).toContain('let __apiKey_QueryKey: TokenProvider | null = null;');
      expect(out).toContain('export function setApiKey(key: TokenProvider | null): void {');
      expect(out).toContain('__apiKey_QueryKey = key;');
    });

    it('treats a sole apiKey scheme as sole regardless of its in (cookie)', () => {
      const out = renderAuth(
        [{ kind: 'apiKeyCookie', key: 'CookieKey', cookieName: 'sid' }],
        false,
        false
      );
      expect(out).toContain('export function setApiKey(key: TokenProvider | null): void {');
    });

    it('keyed names when more than one apiKey scheme exists across different in', () => {
      const out = renderAuth(
        [
          { kind: 'apiKeyHeader', key: 'HeaderKey', headerName: 'X-API-Key' },
          { kind: 'apiKeyQuery', key: 'QueryKey', paramName: 'api_key' },
        ],
        false,
        false
      );
      expect(out).toContain(
        'export function setApiKeyHeaderKey(key: TokenProvider | null): void {'
      );
      expect(out).toContain('export function setApiKeyQueryKey(key: TokenProvider | null): void {');
      expect(out).not.toContain('export function setApiKey(');
    });

    it('sanitizes non-identifier characters in the slot name', () => {
      const out = renderAuth(
        [{ kind: 'apiKeyHeader', key: 'my-key.v2', headerName: 'X-Key' }],
        false,
        false
      );
      expect(out).toContain('let __apiKey_my_key_v2: TokenProvider | null = null;');
    });
  });

  describe('__resolve + __auth emission gating', () => {
    it('emits neither __resolve nor __auth when no operation is authed', () => {
      const out = renderAuth([{ kind: 'bearer', key: 'OAuth2' }], false, false);
      expect(out).toContain('export function setBearer');
      expect(out).not.toContain('function __auth(');
      expect(out).not.toContain('function __resolve(');
    });

    it('emits __resolve + __auth when an operation is authed and a resolvable scheme exists', () => {
      const out = renderAuth([{ kind: 'bearer', key: 'OAuth2' }], true, false);
      expect(out).toContain(
        'async function __resolve(slot: TokenProvider | null): Promise<string | null> {'
      );
      expect(out).toContain('return typeof slot === "function" ? slot() : slot;');
      expect(out).toContain('async function __auth(schemes: string[], config: ClientConfig)');
    });

    it('does NOT emit __resolve for a basic-only authed set (nothing resolvable)', () => {
      const out = renderAuth([{ kind: 'basic', key: 'Basic' }], true, false);
      expect(out).not.toContain('function __resolve(');
      // but __auth IS emitted (basic still needs a switch).
      expect(out).toContain('async function __auth(schemes: string[], config: ClientConfig)');
    });

    it('references each write-only slot via `void` when no operation is authed (noUnusedLocals)', () => {
      // With no __auth to read them, the setter-written slots are otherwise
      // unused and would trip TS6133 under --noUnusedLocals.
      const out = renderAuth(allKinds, false, false);
      expect(out).toContain('void __bearerToken;');
      expect(out).toContain('void __basicAuth;');
      expect(out).toContain('void __apiKey_HeaderKey;');
      expect(out).toContain('void __apiKey_QueryKey;');
      expect(out).toContain('void __apiKey_CookieKey;');
    });

    it('omits the `void` no-op block when an operation IS authed (slots are read)', () => {
      const out = renderAuth(allKinds, true, false);
      expect(out).not.toContain('void __bearerToken;');
      expect(out).not.toContain('void __basicAuth;');
    });
  });

  describe('__auth body', () => {
    const out = renderAuth(allKinds, true, true);

    it('is async returning Promise<{ headers; query }> with the export prefix', () => {
      expect(out).toContain(
        'export async function __auth(schemes: string[], config: ClientConfig): Promise<{'
      );
      expect(out).toContain('headers: Record<string, string>;');
      expect(out).toContain('query: Record<string, string>;');
      expect(out).toContain('const headers: Record<string, string> = {};');
      expect(out).toContain('const query: Record<string, string> = {};');
      expect(out).toContain('const cookies: string[] = [];');
      expect(out).toContain('if (cookies.length > 0)');
      expect(out).toContain('headers["Cookie"] = cookies.join("; ");');
      expect(out).toContain('return { headers, query };');
    });

    it('honors the export prefix toggle', () => {
      const internal = renderAuth(allKinds, true, false);
      expect(internal).toContain('async function __auth(schemes: string[], config: ClientConfig)');
      expect(internal).not.toContain('export async function __auth(');
    });

    it('emits a bearer case awaiting __resolve(__bearerToken)', () => {
      expect(out).toContain('case "OAuth2": {');
      // Prefers the per-instance credential, falling back to the global slot.
      expect(out).toContain('const v = await __resolve(config.auth?.bearer ?? __bearerToken);');
      expect(out).toContain('headers["Authorization"] = `Bearer ${v}`;');
    });

    it('emits a basic case preferring config.auth.basic over the global __basicAuth', () => {
      expect(out).toContain('case "Basic":');
      expect(out).toContain('const b = config.auth?.basic;');
      expect(out).toContain('const basic = b ? btoa(`${b.username}:${b.password}`) : __basicAuth;');
      expect(out).toContain('if (basic !== null)');
      expect(out).toContain('headers["Authorization"] = `Basic ${basic}`;');
    });

    it('emits an apiKeyHeader case assigning headers[name]', () => {
      expect(out).toContain('case "HeaderKey": {');
      expect(out).toContain(
        'const v = await __resolve(config.auth?.apiKey?.["HeaderKey"] ?? __apiKey_HeaderKey);'
      );
      expect(out).toContain('headers["X-API-Key"] = v;');
    });

    it('emits an apiKeyQuery case assigning query[param]', () => {
      expect(out).toContain('case "QueryKey": {');
      expect(out).toContain(
        'const v = await __resolve(config.auth?.apiKey?.["QueryKey"] ?? __apiKey_QueryKey);'
      );
      expect(out).toContain('query["api_key"] = v;');
    });

    it('emits an apiKeyCookie case pushing `<name>=<value>`', () => {
      expect(out).toContain('case "CookieKey": {');
      expect(out).toContain(
        'const v = await __resolve(config.auth?.apiKey?.["CookieKey"] ?? __apiKey_CookieKey);'
      );
      expect(out).toContain('cookies.push("sid=" + v);');
    });

    it('escapes a cookieName containing a backtick and `${` without breaking out of a template', () => {
      const out = renderAuth(
        [{ kind: 'apiKeyCookie', key: 'CookieKey', cookieName: 'we`ird${x}' }],
        true,
        true
      );
      // The name is emitted as a JSON string literal concatenated with the value,
      // never interpolated into a backtick template.
      expect(out).toContain('cookies.push("we`ird${x}=" + v);');
      // No backtick template literal anywhere in the emitted cookie handling.
      expect(out).not.toContain('cookies.push(`');
      // The dangerous template-break sequence is only ever inside the JSON literal,
      // so the emitted body has no unterminated/escaped-into-template fragment.
      expect(out).not.toContain('`we`ird');
    });

    it('produces no undefined-indexed assignment and every case references a declared slot', () => {
      expect(out).not.toContain('out[undefined]');
      expect(out).not.toContain('[undefined]');
      // Every `case "<key>":` body references a known slot / __basicAuth.
      const slots = ['__bearerToken', '__basicAuth', '__apiKey_'];
      const cases = out.split(/case "/).slice(1);
      for (const c of cases) {
        const body = c.slice(0, c.indexOf('break;'));
        expect(slots.some((s) => body.includes(s))).toBe(true);
      }
    });
  });
});

describe('authTypeNames', () => {
  it('returns [] when there are no schemes', () => {
    expect(authTypeNames([])).toEqual([]);
  });

  it('returns [TokenProvider, AuthCredentials] when a bearer scheme exists', () => {
    expect(authTypeNames([{ kind: 'bearer', key: 'oauth' }])).toEqual([
      'TokenProvider',
      'AuthCredentials',
    ]);
  });

  it('returns [TokenProvider, AuthCredentials] when an apiKey scheme exists', () => {
    expect(authTypeNames([{ kind: 'apiKeyQuery', key: 'k', paramName: 'api_key' }])).toEqual([
      'TokenProvider',
      'AuthCredentials',
    ]);
  });

  it('returns [AuthCredentials] for a basic-only scheme set (no TokenProvider)', () => {
    expect(authTypeNames([{ kind: 'basic', key: 'Basic' }])).toEqual(['AuthCredentials']);
  });
});

describe('authSetterNames', () => {
  it('returns nothing when there are no schemes', () => {
    expect(authSetterNames([])).toEqual([]);
  });

  it('names setBearer for a bearer scheme', () => {
    expect(authSetterNames([{ kind: 'bearer', key: 'oauth' }])).toEqual(['setBearer']);
  });

  it('names setBasicAuth for a basic scheme', () => {
    expect(authSetterNames([{ kind: 'basic', key: 'Basic' }])).toEqual(['setBasicAuth']);
  });

  it('names a sole apiKey scheme (any in) setApiKey', () => {
    expect(authSetterNames([{ kind: 'apiKeyQuery', key: 'k', paramName: 'api_key' }])).toEqual([
      'setApiKey',
    ]);
  });

  it('orders setBearer, setBasicAuth, then apiKey setters in scheme order', () => {
    expect(
      authSetterNames([
        { kind: 'apiKeyHeader', key: 'admin', headerName: 'X-Admin' },
        { kind: 'basic', key: 'Basic' },
        { kind: 'bearer', key: 'oauth' },
        { kind: 'apiKeyCookie', key: 'tenant', cookieName: 'sid' },
      ])
    ).toEqual(['setBearer', 'setBasicAuth', 'setApiKeyAdmin', 'setApiKeyTenant']);
  });

  it('counts all apiKey kinds (any in) for the sole-naming rule', () => {
    expect(
      authSetterNames([
        { kind: 'apiKeyHeader', key: 'h', headerName: 'X-H' },
        { kind: 'apiKeyQuery', key: 'q', paramName: 'api_key' },
      ])
    ).toEqual(['setApiKeyH', 'setApiKeyQ']);
  });
});

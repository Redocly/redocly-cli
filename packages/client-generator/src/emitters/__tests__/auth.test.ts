import type { SecuritySchemeModel } from '../../intermediate-representation/model.js';
import { apiKeySetterName, authSetterNames } from '../auth.js';

/** A spec exercising all five injectable kinds at once. */
const allKinds: SecuritySchemeModel[] = [
  { kind: 'bearer', key: 'OAuth2' },
  { kind: 'basic', key: 'Basic' },
  { kind: 'apiKeyHeader', key: 'HeaderKey', headerName: 'X-API-Key' },
  { kind: 'apiKeyQuery', key: 'QueryKey', paramName: 'api_key' },
  { kind: 'apiKeyCookie', key: 'CookieKey', cookieName: 'sid' },
];

describe('apiKeySetterName', () => {
  it('is the bare setApiKey for a sole apiKey scheme', () => {
    expect(apiKeySetterName('anything', true)).toBe('setApiKey');
  });

  it('suffixes the PascalCased scheme key when several apiKey schemes exist', () => {
    expect(apiKeySetterName('cookieAuth', false)).toBe('setApiKeyCookieAuth');
    expect(apiKeySetterName('QueryKey', false)).toBe('setApiKeyQueryKey');
  });
});

describe('authSetterNames', () => {
  it('returns no names when there are no schemes', () => {
    expect(authSetterNames([])).toEqual([]);
  });

  it('emits setBearer once for any number of bearer schemes', () => {
    expect(
      authSetterNames([
        { kind: 'bearer', key: 'OAuth2' },
        { kind: 'bearer', key: 'BearerHttp' },
      ])
    ).toEqual(['setBearer']);
  });

  it('emits setBasicAuth for basic schemes', () => {
    expect(authSetterNames([{ kind: 'basic', key: 'Basic' }])).toEqual(['setBasicAuth']);
  });

  it('names a sole apiKey scheme setApiKey regardless of its `in`', () => {
    expect(
      authSetterNames([{ kind: 'apiKeyCookie', key: 'CookieKey', cookieName: 'sid' }])
    ).toEqual(['setApiKey']);
  });

  it('disambiguates several apiKey schemes with the PascalCased key', () => {
    expect(
      authSetterNames([
        { kind: 'apiKeyHeader', key: 'HeaderKey', headerName: 'X-API-Key' },
        { kind: 'apiKeyQuery', key: 'QueryKey', paramName: 'api_key' },
      ])
    ).toEqual(['setApiKeyHeaderKey', 'setApiKeyQueryKey']);
  });

  it('orders the full surface bearer → basic → apiKey (emission order)', () => {
    expect(authSetterNames(allKinds)).toEqual([
      'setBearer',
      'setBasicAuth',
      'setApiKeyHeaderKey',
      'setApiKeyQueryKey',
      'setApiKeyCookieKey',
    ]);
  });
});

import { getIdentityKey } from '../node-identity.js';

describe('getIdentityKey', () => {
  it('keys Parameter by in+name', () => {
    expect(getIdentityKey('Parameter', { in: 'query', name: 'limit' })).toBe('{query:limit}');
  });

  it('keys Server by url with pointer escaping', () => {
    expect(getIdentityKey('Server', { url: 'https://api.example.com/v1' })).toBe(
      '{https:~1~1api.example.com~1v1}'
    );
  });

  it('keys Tag by name', () => {
    expect(getIdentityKey('Tag', { name: 'pets' })).toBe('{pets}');
  });

  it('keys SecurityRequirement by sorted scheme names', () => {
    expect(getIdentityKey('SecurityRequirement', { oauth: [], apiKey: [] })).toBe('{apiKey+oauth}');
  });

  it('returns undefined for unknown types and malformed values (positional fallback)', () => {
    expect(getIdentityKey('Schema', { type: 'string' })).toBeUndefined();
    expect(getIdentityKey('Parameter', { name: 'limit' })).toBeUndefined(); // no `in`
    expect(getIdentityKey('Parameter', 'not-an-object')).toBeUndefined();
  });
});

import { isIdentifier, safeIdent, uniqueIdent } from '../identifier.js';

describe('isIdentifier', () => {
  it('accepts valid identifiers (letters, _, $, digits after the first char)', () => {
    expect(isIdentifier('foo')).toBe(true);
    expect(isIdentifier('_foo')).toBe(true);
    expect(isIdentifier('$foo')).toBe(true);
    expect(isIdentifier('foo123')).toBe(true);
  });

  it('rejects names that are not valid identifiers', () => {
    expect(isIdentifier('foo-bar')).toBe(false);
    expect(isIdentifier('2fa')).toBe(false);
    expect(isIdentifier('has space')).toBe(false);
    expect(isIdentifier('')).toBe(false);
  });
});

describe('safeIdent', () => {
  it('returns a valid, non-reserved name bare', () => {
    expect(safeIdent('limit')).toBe('limit');
  });

  it('quotes a reserved word (a bare reserved word would not be a usable key)', () => {
    expect(safeIdent('default')).toBe('"default"');
  });

  it('quotes a name that is not a valid identifier', () => {
    expect(safeIdent('X-Request-Id')).toBe('"X-Request-Id"');
  });
});

describe('uniqueIdent', () => {
  it('keeps a clean identifier unchanged and records it', () => {
    const used = new Set<string>();
    expect(uniqueIdent('orderId', used)).toBe('orderId');
    expect(used.has('orderId')).toBe(true);
  });

  it('replaces non-identifier characters with underscores', () => {
    expect(uniqueIdent('pet-id', new Set())).toBe('pet_id');
  });

  it('prefixes a leading digit with an underscore', () => {
    expect(uniqueIdent('2fa', new Set())).toBe('_2fa');
  });

  it('prefixes a reserved word with an underscore', () => {
    expect(uniqueIdent('new', new Set())).toBe('_new');
  });

  it('suffixes collisions with an incrementing counter', () => {
    const used = new Set<string>();
    expect(uniqueIdent('a.b', used)).toBe('a_b');
    expect(uniqueIdent('a-b', used)).toBe('a_b_2');
    expect(uniqueIdent('a b', used)).toBe('a_b_3');
  });
});

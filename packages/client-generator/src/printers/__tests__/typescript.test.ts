import {
  codeLiteral,
  isIdentifier,
  safeIdent,
  sanitizeCodeString,
  uniqueIdent,
} from '../typescript.js';

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

  it('treats strict-mode reserved words as reserved (modules are always strict)', () => {
    // GitHub's real description has a schema named `package`; `type X = package[]` is TS1214.
    expect(uniqueIdent('package', new Set())).toBe('_package');
    expect(uniqueIdent('let', new Set())).toBe('_let');
    expect(uniqueIdent('await', new Set())).toBe('_await');
  });

  it('suffixes collisions with an incrementing counter', () => {
    const used = new Set<string>();
    expect(uniqueIdent('a.b', used)).toBe('a_b');
    expect(uniqueIdent('a-b', used)).toBe('a_b_2');
    expect(uniqueIdent('a b', used)).toBe('a_b_3');
  });
});

// Literal expectations for the data-literal renderer (single-line, printer-style).
const CASES: Array<[string, unknown]> = [
  ['string', 'plain'],
  ['string with quotes and backslashes', 'say "hi" \\ done'],
  ['string with newline', 'a\nb'],
  ['number', 42],
  ['negative number', -3.5],
  ['booleans', true],
  ['null', null],
  ['empty array', []],
  ['array', ['a', 1, false]],
  ['empty object', {}],
  ['flat object', { id: 'getPet', method: 'GET', count: 2 }],
  ['reserved-word key stays bare', { in: 'query', name: 'limit' }],
  ['non-identifier key is quoted', { 'X-Request-Id': 'header', 'a-b': 1 }],
  [
    'nested descriptor-like shape',
    {
      id: 'listOrders',
      path: '/orders/{id}',
      params: [
        { name: 'id', in: 'path' },
        { name: 'page-size', in: 'query', explode: false },
      ],
      security: [[{ scheme: 'Bearer', kind: 'bearer' }]],
      pagination: { style: 'cursor', cursorParam: 'after', items: '/items' },
    },
  ],
];

describe('codeLiteral', () => {
  it.each(CASES)('%s', (_label, value) => {
    expect(codeLiteral(value)).toMatchSnapshot();
  });
});

describe('sanitizeCodeString', () => {
  // The literal must survive being read back: a sanitizer that escapes what
  // `JSON.stringify` already escaped doubles the backslashes and, for a quote, ends the
  // string early — emitting TypeScript that does not parse.
  it.each([
    ['a newline', 'a\nb'],
    ['a quote', 'quote " here'],
    ['a backslash', 'C:\\path'],
    ['a tab', 'tab\there'],
    ['a line separator', 'a\u2028b'],
    ['everything at once', 'a\n"b"\\c\u2029<d>'],
  ])('round-trips %s', (_label, value) => {
    expect(JSON.parse(sanitizeCodeString(value))).toBe(value);
    expect(JSON.parse(codeLiteral(value) as string)).toBe(value);
  });

  it('escapes the characters that break out of a code context', () => {
    // `</script>` must not survive intact into an inline script.
    expect(sanitizeCodeString('</script>')).not.toContain('</script>');
    expect(sanitizeCodeString('</script>')).toContain('\\u003C');
    expect(sanitizeCodeString('a\u2028b')).toContain('\\u2028');
  });
});

import { codeLiteral, sanitizeCodeString } from '../ts-literal.js';

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

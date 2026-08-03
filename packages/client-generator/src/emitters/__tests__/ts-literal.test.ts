import { codeLiteral } from '../ts-literal.js';

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

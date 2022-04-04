import { Assertions } from '../.';

const opts = {
  '0': {
    subject: 'Operation',
    property: 'summary',
    description: 'example warn text',
    severity: 'warn',
    pattern: '/example/',
  },
  '1': {
    subject: 'PathItem',
    context: [{ type: 'Operation', matchParentKeys: ['post'] }],
    description: 'example warn text',
    severity: 'warn',
    mutuallyExclusive: ['summary', 'security'],
  },
  '2': {
    subject: ['PathItem'],
    context: [{ type: 'Operation' }],
    property: 'tags',
    description: 'example warn text',
    severity: 'warn',
    sortOrder: 'desc',
  },
  '3': {
    subject: ['Foo'],
    context: [{ type: 'Bar' }, { type: 'Baz' }],
    property: 'test',
    description: 'example warn text',
    severity: 'warn',
    sortOrder: 'desc',
  },
};

describe('Oas3 assertions', () => {
  it('should return the right visitor structure', () => {
    const visitors = Assertions(opts) as any;
    expect(visitors).toMatchInlineSnapshot(`
      Array [
        Object {
          "Operation": [Function],
        },
        Object {
          "Operation": Object {
            "PathItem": [Function],
            "skip": [Function],
          },
        },
        Object {
          "Operation": Object {
            "PathItem": [Function],
          },
        },
        Object {
          "Bar": Object {
            "Baz": Object {
              "Foo": [Function],
            },
          },
        },
      ]
    `);
  });
});

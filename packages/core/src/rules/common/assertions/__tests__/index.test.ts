import { Assertions } from '../index.js';

const opts = {
  '0': {
    subject: {
      type: 'Operation',
      property: 'summary',
    },
    description: 'example warn text',
    severity: 'warn',
    assertions: { pattern: '/example/' },
  },
  '1': {
    subject: {
      type: 'PathItem',
    },
    where: [
      {
        subject: { type: 'Operation', filterInParentKeys: ['post'], property: 'responses' },
        assertions: { defined: true },
      },
    ],
    description: 'example warn text',
    severity: 'warn',
    assertions: { mutuallyExclusive: ['summary', 'security'] },
  },
  '2': {
    subject: { type: 'PathItem', property: 'tags' },
    where: [
      { subject: { type: 'Operation', property: 'responses' }, assertions: { defined: true } },
    ],
    description: 'example warn text',
    severity: 'warn',
    assertions: { sortOrder: 'desc' },
  },
  '3': {
    subject: { type: 'Foo', property: 'test' },
    where: [
      { subject: { type: 'Bar' }, assertions: {} },
      { subject: { type: 'Baz' }, assertions: {} },
    ],
    description: 'example warn text',
    severity: 'warn',
    assertions: { sortOrder: 'desc' },
  },
  '4': {
    subject: {
      type: 'any',
      property: 'description',
    },
    description: 'example warn text',
    severity: 'warn',
    assertions: { notPattern: '/example/' },
  },
};

describe('Oas3 assertions', () => {
  it('should return the right visitor structure', () => {
    const visitors = Assertions(opts as any);
    expect(visitors).toMatchInlineSnapshot(`
      [
        {
          "Operation": {
            "enter": [Function],
          },
        },
        {
          "Operation": {
            "PathItem": {
              "enter": [Function],
            },
            "skip": [Function],
          },
        },
        {
          "Operation": {
            "PathItem": {
              "enter": [Function],
            },
            "skip": [Function],
          },
        },
        {
          "Bar": {
            "Baz": {
              "Foo": {
                "enter": [Function],
              },
            },
          },
        },
        {
          "any": {
            "enter": [Function],
          },
        },
      ]
    `);
  });

  it('should throw a named error when the assertions block is missing', () => {
    const rule = {
      'rule/no-assertions': {
        assertionId: 'rule/no-assertions',
        subject: { type: 'Operation', property: 'summary' },
      },
    };

    expect(() => Assertions(rule as any)).toThrow(
      "rule/no-assertions: 'assertions' (Object) is required"
    );
  });

  it('should throw a named error when the assertions block is missing in a where clause', () => {
    const rule = {
      'rule/no-assertions-in-where': {
        assertionId: 'rule/no-assertions-in-where',
        subject: { type: 'Operation', property: 'summary' },
        assertions: { pattern: '/example/' },
        where: [{ subject: { type: 'PathItem' } }],
      },
    };

    expect(() => Assertions(rule as any)).toThrow(
      "rule/no-assertions-in-where -> where -> [0]: 'assertions' (Object) is required"
    );
  });
});

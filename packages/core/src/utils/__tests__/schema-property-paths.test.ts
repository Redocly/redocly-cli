import {
  getSchemaPropertyNames,
  getSchemaPropertyPaths,
  getValuePropertyPaths,
} from '../schema-property-paths.js';

// A problem can carry the problem that caused it, so the dereferenced schema is circular.
const problemProperties: Record<string, unknown> = { title: { type: 'string' } };
const problem = { type: 'object', properties: problemProperties };
problemProperties.cause = problem;

const order = {
  allOf: [
    {
      type: 'object',
      properties: {
        id: { type: 'string', readOnly: true },
        customerName: { type: 'string' },
        couponCode: { type: 'string', writeOnly: true },
        orderItems: {
          type: 'array',
          items: {
            oneOf: [
              {
                type: 'object',
                properties: { menuItemId: { type: 'string' }, volume: { type: 'number' } },
              },
              {
                type: 'object',
                properties: { menuItemId: { type: 'string' }, calories: { type: 'number' } },
              },
            ],
          },
        },
        problem,
      },
    },
  ],
};

describe('getSchemaPropertyPaths', () => {
  it('lists the properties of composed, nested, and recursive schemas for a request', () => {
    expect(Array.from(getSchemaPropertyPaths(order, 'request'))).toEqual([
      'customerName',
      'couponCode',
      'orderItems',
      'orderItems[].menuItemId',
      'orderItems[].volume',
      'orderItems[].calories',
      'problem',
      'problem.title',
      'problem.cause',
    ]);
  });
});

describe('getSchemaPropertyNames', () => {
  it('lists the properties of the schema itself, through its composition', () => {
    expect(Array.from(getSchemaPropertyNames(order, 'response'))).toEqual([
      'id',
      'customerName',
      'orderItems',
      'problem',
    ]);
  });
});

describe('getValuePropertyPaths', () => {
  it('lists only the documented properties that a response carries', () => {
    const response = {
      id: 'ord_01h1s5z6vf2mm1mz3hevnn9va7',
      customerName: 'Jane',
      couponCode: 'SPRING',
      orderItems: [{ menuItemId: 'prd_01h1s5z6vf2mm1mz3hevnn9va7', calories: 450, note: 'Hot' }],
      problem: { title: 'Out of stock', cause: { title: 'Delivery is late' } },
    };

    expect(Array.from(getValuePropertyPaths(response, order, 'response'))).toEqual([
      'id',
      'customerName',
      'orderItems',
      'orderItems[].menuItemId',
      'orderItems[].calories',
      'problem',
      'problem.title',
      'problem.cause',
    ]);
  });
});

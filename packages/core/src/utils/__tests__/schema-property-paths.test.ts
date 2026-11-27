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

// An order and its customer reference each other, and a receipt carries two orders.
const customerProperties: Record<string, unknown> = { name: { type: 'string' } };
const orderProperties = {
  id: { type: 'string' },
  customer: { type: 'object', properties: customerProperties },
};
customerProperties.lastOrder = { type: 'object', properties: orderProperties };
const receipt = {
  type: 'object',
  properties: {
    order: { type: 'object', properties: orderProperties },
    previousOrder: { type: 'object', properties: orderProperties },
  },
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

  it('follows the schemas that reference each other only where they first appear', () => {
    expect(Array.from(getSchemaPropertyPaths(receipt, 'response'))).toEqual([
      'order',
      'order.id',
      'order.customer',
      'order.customer.name',
      'order.customer.lastOrder',
      'order.customer.lastOrder.id',
      'order.customer.lastOrder.customer',
      'previousOrder',
      'previousOrder.id',
      'previousOrder.customer',
      'previousOrder.customer.name',
      'previousOrder.customer.lastOrder',
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

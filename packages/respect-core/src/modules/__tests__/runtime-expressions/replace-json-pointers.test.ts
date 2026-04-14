import { replaceJSONPointers } from '../../runtime-expressions/replace-json-pointers.js';

describe('replaceJSONPointers', () => {
  it('should replace valid $response.body pointers with the correct value from context', () => {
    const context = {
      $response: {
        body: {
          user: {
            name: 'John Doe',
            age: 30,
          },
        },
      },
    };

    const expression = 'Hello, $response.body#/user/name!';
    const result = replaceJSONPointers(expression, context);

    expect(result).toBe('Hello, "John Doe"!');
  });

  it('should replace valid $request.body pointers with the correct value from context', () => {
    const context = {
      $request: {
        body: {
          order: {
            id: '12345',
            amount: 100,
          },
        },
      },
    };

    const expression = 'Order ID: $request.body#/order/id and Amount: $request.body#/order/amount';
    const result = replaceJSONPointers(expression, context);

    expect(result).toBe('Order ID: "12345" and Amount: 100');
  });

  it('should return the original expression if pointer is invalid', () => {
    const context = {
      $response: {
        body: {
          user: {
            name: 'John Doe',
          },
        },
      },
    };

    const expression = 'Hello, $response.body#/invalid/path!';
    const result = replaceJSONPointers(expression, context);

    // The expression should remain unchanged if the pointer is invalid
    expect(result).toBe('Hello, $response.body#/invalid/path!');
  });

  it('should return the original expression if the context is missing', () => {
    const context = {}; // No $response or $request in context

    const expression = 'Hello, $response.body#/user/name!';
    const result = replaceJSONPointers(expression, context);

    // The expression should remain unchanged if context is missing
    expect(result).toBe('Hello, $response.body#/user/name!');
  });

  it('should handle multiple valid pointers in a single expression', () => {
    const context = {
      $response: {
        body: {
          user: {
            name: 'John Doe',
          },
          order: {
            id: '12345',
          },
        },
      },
    };

    const expression = 'User: $response.body#/user/name, Order ID: $response.body#/order/id';
    const result = replaceJSONPointers(expression, context);

    expect(result).toBe('User: "John Doe", Order ID: "12345"');
  });

  it('should replace valid $response.body pointers with the correct value from context', () => {
    const context = {
      $response: {
        body: {
          notification: {
            type: 'info',
            message: 'Service will be unavailable tonight.',
          },
        },
      },
    };

    const expression = 'Notification: $response.body#/notification/message';
    const result = replaceJSONPointers(expression, context);

    expect(result).toBe('Notification: "Service will be unavailable tonight."');
  });

  it('should return original expression if pointer does not exist in body', () => {
    const context = {
      $response: {
        body: {
          data: {
            value: 42,
          },
        },
      },
    };

    const expression = 'Result: $response.body#/nonexistent/path';
    const result = replaceJSONPointers(expression, context);

    expect(result).toBe('Result: $response.body#/nonexistent/path');
  });

  it('should return number values without quotes', () => {
    const context = {
      $response: {
        body: {
          order: {
            amount: 100,
          },
        },
      },
    };

    const expression = 'Amount: $response.body#/order/amount';
    const result = replaceJSONPointers(expression, context);

    expect(result).toBe('Amount: 100'); // No quotes for numbers
  });

  it('should return the original match if the value is undefined', () => {
    const context = {
      $response: {
        body: {
          data: {
            value: undefined, // Pointer exists but is undefined
          },
        },
      },
    };

    const expression = 'Data: $response.body#/data/value';
    const result = replaceJSONPointers(expression, context);

    // Since the value is undefined, it should return the original match
    expect(result).toBe('Data: $response.body#/data/value');
  });

  it('should correctly replace empty array values', () => {
    const context = {
      $response: {
        body: {
          items: [],
        },
      },
    };

    const expression = '$response.body#/items == []';
    const result = replaceJSONPointers(expression, context);

    expect(result).toBe('[] == []');
  });

  it('should correctly replace hyphenated keys', () => {
    const context = {
      $response: {
        body: {
          'test-hyphenated-key-with-value': 'some-value-to-test',
        },
      },
    };

    const expression = '$response.body#/test-hyphenated-key-with-value';
    const result = replaceJSONPointers(expression, context);

    expect(result).toBe('"some-value-to-test"');
  });
});

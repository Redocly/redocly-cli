import { logger } from '@redocly/openapi-core';

import { type RuntimeExpressionContext } from '../../../types.js';
import { handlePayloadReplacements } from '../../context-parser/index.js';

describe('handlePayloadReplacements', () => {
  it('should replace the value using JSON Pointer', () => {
    const payload = {
      foo: 'bar',
    };
    const replacements = [
      {
        target: '/foo',
        value: 'baz',
      },
    ];
    const expressionContext = {
      step: {
        outputs: {
          event: payload,
        },
      },
    } as unknown as RuntimeExpressionContext;

    handlePayloadReplacements({ payload, replacements, expressionContext, logger });

    expect(payload).toEqual({
      foo: 'baz',
    });
  });

  it('should throw an error if the RequestBody value is not found at JSON Pointer', () => {
    const payload = {
      foo: 'bar',
    };
    const replacements = [
      {
        target: '/bar',
        value: 'baz',
      },
    ];
    const expressionContext = {
      step: {
        outputs: {
          event: payload,
        },
      },
    } as unknown as RuntimeExpressionContext;

    expect(() =>
      handlePayloadReplacements({ payload, replacements, expressionContext, logger })
    ).toThrow('Invalid JSON Pointer: /bar');
  });

  it('should report the error of a replacement value that cannot be evaluated', () => {
    const payload = {
      foo: 'bar',
    };
    const replacements = [
      {
        target: '/foo',
        value: { context: '$inputs.order', selector: '$.missing', type: 'jsonpath' },
      },
    ];
    const expressionContext = {
      $inputs: { order: { quantity: 1 } },
    } as unknown as RuntimeExpressionContext;

    expect(() =>
      handlePayloadReplacements({ payload, replacements, expressionContext, logger })
    ).toThrow('JSONPath selector "$.missing" selects no value in "$inputs.order".');
  });

  it('should throw an error if the target is not a string', () => {
    const payload = {
      foo: 'bar',
    };
    const replacements = [{ target: 1, value: 'baz' }] as any;
    const expressionContext = {
      step: {
        outputs: {
          event: payload,
        },
      },
    } as unknown as RuntimeExpressionContext;

    expect(() =>
      handlePayloadReplacements({ payload, replacements, expressionContext, logger })
    ).toThrow('Invalid JSON Pointer: 1');
  });
});

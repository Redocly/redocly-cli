import type { RuntimeExpressionContext } from '../../../types.js';
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

    handlePayloadReplacements(payload, replacements, expressionContext);

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

    expect(() => handlePayloadReplacements(payload, replacements, expressionContext)).toThrowError(
      'Invalid JSON Pointer: /bar'
    );
  });

  it('should throw an error if the target is not a string', () => {
    const payload = {
      foo: 'bar',
    };
    const replacements = [{ target: 1, value: 'baz' }];
    const expressionContext = {
      step: {
        outputs: {
          event: payload,
        },
      },
    } as unknown as RuntimeExpressionContext;
    // @ts-expect-error
    expect(() => handlePayloadReplacements(payload, replacements, expressionContext)).toThrowError(
      'Invalid JSON Pointer: 1'
    );
  });
});

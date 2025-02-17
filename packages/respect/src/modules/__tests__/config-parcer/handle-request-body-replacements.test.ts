import { handlePayloadReplacements } from '../../config-parser';

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

    handlePayloadReplacements(payload, replacements);

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

    expect(() => handlePayloadReplacements(payload, replacements)).toThrowError(
      'Invalid JSON Pointer: /bar'
    );
  });

  it('should throw an error if the target is not a string', () => {
    const payload = {
      foo: 'bar',
    };
    const replacements = [{ target: 1, value: 'baz' }];

    // @ts-expect-error
    expect(() => handlePayloadReplacements(payload, replacements)).toThrowError(
      'Invalid JSON Pointer: 1'
    );
  });
});

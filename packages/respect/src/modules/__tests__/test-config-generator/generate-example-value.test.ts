import type { Parameter } from '../../../types';

import { generateExampleValue } from '../../test-config-generator';

describe('generateExampleValue', () => {
  it('should generate example value from parameter example', () => {
    const parameter = {
      in: 'header',
      name: 'some-parameter-in-header',
      value: 'test-value',
      example: 'some-example',
    } as Parameter;

    expect(generateExampleValue(parameter)).toEqual('some-example');
  });

  it('should generate example value from parameter examples', () => {
    const parameter = {
      in: 'query',
      name: 'some-parameter-in-header',
      value: 'test-value',
      examples: {
        'some-example-key': {
          value: 'some-example-value',
        },
      },
    } as Parameter;

    expect(generateExampleValue(parameter)).toEqual('some-example-value');
  });

  it('should generate example value from parameter schema', () => {
    const parameter = {
      in: 'path',
      name: 'some-parameter-in-header',
      value: 'test-value',
      schema: {
        type: 'string',
      },
    } as Parameter;

    expect(generateExampleValue(parameter)).toEqual('string');
  });
});

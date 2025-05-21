import { resolveXSecurityParameters } from '../../flow-runner/resolve-x-security-parameters.js';

import type { Step, RuntimeExpressionContext } from 'respect-core/src/types.js';

describe('resolveXSecurityParameters', () => {
  it('should resolve x-security parameters', () => {
    const runtimeContext = {
      $steps: {
        basicAuth: {
          outputs: {
            token: '12345',
          },
        },
      },
    } as unknown as RuntimeExpressionContext;

    const step = {
      stepId: 'getPet',
      'x-security': [
        {
          scheme: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
          values: {
            token: '$steps.basicAuth.outputs.token',
          },
        },
      ],
    } as unknown as Step;

    const parameters = resolveXSecurityParameters({
      runtimeContext,
      step,
    });
    expect(parameters).toEqual([
      {
        name: 'Authorization',
        in: 'header',
        value: 'Bearer 12345',
      },
    ]);
    expect(step['x-security']?.[0]?.values).toEqual({
      token: '12345',
    });
  });
});

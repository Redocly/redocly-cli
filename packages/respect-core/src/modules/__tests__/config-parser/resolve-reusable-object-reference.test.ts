import { logger } from '@redocly/openapi-core';

import { type TestContext } from '../../../types.js';
import { resolveReusableObjectReference } from '../../context-parser/resolve-reusable-object-reference.js';

describe('resolveReusableObjectReference', () => {
  it.each(['$components.inputs.test', '$components.successActions.test'])(
    'should throw an error if a parameter reference points to %s',
    (reference) => {
      expect(() =>
        resolveReusableObjectReference(
          { reference },
          {
            options: {
              logger,
            },
          } as unknown as TestContext,
          'parameters'
        )
      ).toThrow(`Invalid reference ${reference}: it must point to $components.parameters.`);
    }
  );

  it('should return the parameter if the reference is valid', () => {
    expect(
      resolveReusableObjectReference(
        { reference: '$components.parameters.test' },
        {
          $components: { parameters: { test: { value: 'test', in: 'query', name: 'test' } } },
          options: {
            logger,
          },
        } as unknown as TestContext,
        'parameters'
      )
    ).toEqual({
      value: 'test',
      in: 'query',
      name: 'test',
    });
  });

  it('should return the failure action if the reference is valid', () => {
    expect(
      resolveReusableObjectReference(
        { reference: '$components.failureActions.retryAction' },
        {
          $components: {
            failureActions: {
              retryAction: {
                name: 'retryAction',
                type: 'retry',
                workflowId: 'final-workflow',
                criteria: [{ condition: '$statusCode == 200' }],
              },
            },
          },
          options: {
            logger,
          },
        } as unknown as TestContext,
        'failureActions'
      )
    ).toEqual({
      name: 'retryAction',
      type: 'retry',
      workflowId: 'final-workflow',
      criteria: [{ condition: '$statusCode == 200' }],
    });
  });

  it('should return the success action if the reference is valid', () => {
    expect(
      resolveReusableObjectReference(
        { reference: '$components.successActions.gotoSuccessAction' },
        {
          $components: {
            successActions: {
              gotoSuccessAction: {
                name: 'gotoSuccessAction',
                type: 'goto',
                workflowId: 'final-workflow',
                criteria: [{ condition: '$statusCode == 200' }],
              },
            },
          },
          options: {
            logger,
          },
        } as unknown as TestContext,
        'successActions'
      )
    ).toEqual({
      name: 'gotoSuccessAction',
      type: 'goto',
      workflowId: 'final-workflow',
      criteria: [{ condition: '$statusCode == 200' }],
    });
  });

  it.each(['12', false, 0, ''])('should override the value with %j', (value) => {
    expect(
      resolveReusableObjectReference(
        { reference: '$components.parameters.test', value },
        {
          $components: { parameters: { test: { value: 'test', in: 'query', name: 'test' } } },
          options: {
            logger,
          },
        } as unknown as TestContext,
        'parameters'
      )
    ).toEqual({
      value,
      in: 'query',
      name: 'test',
    });
  });
});

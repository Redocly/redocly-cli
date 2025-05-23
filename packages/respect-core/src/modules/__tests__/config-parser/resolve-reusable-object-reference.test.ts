import type { TestContext } from '../../../types';

import { resolveReusableObjectReference } from '../../context-parser/resolve-reusable-object-reference.js';

describe('resolveReusableObjectReference', () => {
  it('should throw an error if the reference is invalid', () => {
    expect(() =>
      resolveReusableObjectReference({ reference: '$components.inputs.test' }, {} as TestContext)
    ).toThrow(
      'Invalid reference: available components are $components.parameters, $components.failureActions, or $components.successActions'
    );
  });

  it('should return the parameter if the reference is valid', () => {
    expect(
      resolveReusableObjectReference({ reference: '$components.parameters.test' }, {
        $components: { parameters: { test: { value: 'test', in: 'query', name: 'test' } } },
      } as unknown as TestContext)
    ).toEqual({
      value: 'test',
      in: 'query',
      name: 'test',
    });
  });

  it('should return the failure action if the reference is valid', () => {
    expect(
      resolveReusableObjectReference({ reference: '$components.failureActions.retryAction' }, {
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
      } as unknown as TestContext)
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
        } as unknown as TestContext
      )
    ).toEqual({
      name: 'gotoSuccessAction',
      type: 'goto',
      workflowId: 'final-workflow',
      criteria: [{ condition: '$statusCode == 200' }],
    });
  });

  it('should override the value if the value is provided', () => {
    expect(
      resolveReusableObjectReference({ reference: '$components.parameters.test', value: '12' }, {
        $components: { parameters: { test: { value: 'test', in: 'query', name: 'test' } } },
      } as unknown as TestContext)
    ).toEqual({
      value: '12',
      in: 'query',
      name: 'test',
    });
  });
});

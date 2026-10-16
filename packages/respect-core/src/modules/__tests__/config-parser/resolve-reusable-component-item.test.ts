import { logger } from '@redocly/openapi-core';

import { type TestContext } from '../../../types.js';
import { resolveReusableComponentItem } from '../../context-parser/index.js';

describe('resolveReusableComponentItem', () => {
  it('should return parameter if not reference', () => {
    expect(
      resolveReusableComponentItem(
        { in: 'query', name: 'test', value: 'test' },
        {
          options: {
            logger,
          },
        } as Partial<TestContext> as TestContext,
        'parameters'
      )
    ).toEqual({
      in: 'query',
      name: 'test',
      value: 'test',
    });
  });

  it('should return success action if not reference', () => {
    expect(
      resolveReusableComponentItem(
        {
          name: 'SuccessActio',
          type: 'goto',
          workflowId: 'test',
          criteria: [{ condition: '$statusCode == 200' }],
        },
        {
          options: {
            logger,
          },
        } as Partial<TestContext> as TestContext,
        'successActions'
      )
    ).toEqual({
      name: 'SuccessActio',
      type: 'goto',
      workflowId: 'test',
      criteria: [{ condition: '$statusCode == 200' }],
    });
  });

  it('should throw an error if reference is not found', () => {
    expect(() =>
      resolveReusableComponentItem(
        { reference: '$components.some.page' },
        {
          options: {
            logger,
          },
        } as Partial<TestContext> as TestContext,
        'parameters'
      )
    ).toThrow('Invalid reference $components.some.page: it must point to $components.parameters.');
  });

  it('should return parameter if reference is found', () => {
    expect(
      resolveReusableComponentItem(
        { reference: '$components.parameters.page' },
        {
          $components: { parameters: { page: { value: 'test', in: 'query', name: 'page' } } },
          options: {
            logger,
          },
        } as unknown as TestContext,
        'parameters'
      )
    ).toEqual({
      value: 'test',
      in: 'query',
      name: 'page',
    });
  });

  it('should return success action if reference is found', () => {
    expect(
      resolveReusableComponentItem(
        { reference: '$components.successActions.SuccessAction' },
        {
          $components: {
            successActions: {
              SuccessAction: {
                name: 'SuccessAction',
                type: 'goto',
                workflowId: 'test',
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
      name: 'SuccessAction',
      type: 'goto',
      workflowId: 'test',
      criteria: [{ condition: '$statusCode == 200' }],
    });
  });
});

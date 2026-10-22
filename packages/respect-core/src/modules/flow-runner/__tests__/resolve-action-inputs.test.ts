import { logger } from '@redocly/openapi-core';

import type { Step, TestContext } from '../../../types.js';
import { resolveActionInputs } from '../resolve-action-inputs.js';

describe('resolveActionInputs', () => {
  const ctx = {
    $inputs: {},
    $steps: {},
    $outputs: {},
    $sourceDescriptions: {},
    $workflows: {
      'place-order': { steps: { 'list-menu-items': {} }, inputs: { drink: 'latte' } },
    },
    $components: {
      parameters: {
        limit: { name: 'limit', value: 5 },
        'search-in-query': { name: 'search', in: 'query', value: 'latte' },
      },
    },
    options: { logger },
  } as unknown as TestContext;

  const step = {
    stepId: 'list-menu-items',
    response: { statusCode: 200, body: { items: [] }, header: {} },
    checks: [],
  } as unknown as Step;

  it('should resolve the parameters against the step response and the workflow inputs', () => {
    const inputs = resolveActionInputs({
      action: {
        name: 'search-menu',
        type: 'goto',
        workflowId: 'search-menu',
        parameters: [
          { name: 'search', value: '{$inputs.drink}-{$statusCode}' },
          { reference: '$components.parameters.limit' },
        ],
      },
      ctx,
      step,
      workflowId: 'place-order',
    });

    expect(inputs).toEqual({ search: 'latte-200', limit: 5 });
  });

  it('should not resolve the parameters of an action that does not reference a workflow', () => {
    const inputs = resolveActionInputs({
      action: {
        name: 'search-again',
        type: 'goto',
        stepId: 'list-menu-items',
        parameters: [{ name: 'search', value: 'latte' }],
      },
      ctx,
      step,
      workflowId: 'place-order',
    });

    expect(inputs).toBeUndefined();
  });

  it('should throw when a parameter has an `in` field', () => {
    expect(() =>
      resolveActionInputs({
        action: {
          name: 'search-menu',
          type: 'goto',
          workflowId: 'search-menu',
          parameters: [{ reference: '$components.parameters.search-in-query' }],
        },
        ctx,
        step,
        workflowId: 'place-order',
      })
    ).toThrow(
      'Parameter search of action search-menu has an "in" field. An action parameter is an input of workflow search-menu, so it only has a name and a value.'
    );
  });
});

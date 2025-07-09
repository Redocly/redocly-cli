import { logger } from '@redocly/openapi-core';

import type { TestContext } from '../../../types.js';

import { createFaker } from '../../faker.js';
import { getValueFromContext, resolvePath } from '../../context-parser/index.js';

describe('getValueFromContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return value from context', () => {
    const ctx = {
      $some: 'test',
    } as unknown as TestContext;
    expect(getValueFromContext({ value: '$some', ctx, logger })).toEqual('test');
  });

  it('should return custom list of objects value', () => {
    const ctx = {
      $some: 'John Wick',
    } as unknown as TestContext;
    expect(
      getValueFromContext({ value: [{ name: '$some' }, { name: 'Jonny Mnemonic' }], ctx, logger })
    ).toEqual([{ name: 'John Wick' }, { name: 'Jonny Mnemonic' }]);
  });

  it('should return custom list value', () => {
    const ctx = {
      $some: 'John Wick',
    } as unknown as TestContext;
    expect(getValueFromContext({ value: ['Jonny Mnemonic', 'John Wick'], ctx, logger })).toEqual([
      'Jonny Mnemonic',
      'John Wick',
    ]);
  });

  it('should return custom object value', () => {
    const ctx = {
      $some: 'John',
    } as unknown as TestContext;
    expect(
      getValueFromContext({ value: { name: '$some', lastname: 'Mnemonic' }, ctx, logger })
    ).toEqual({
      name: 'John',
      lastname: 'Mnemonic',
    });
  });

  it('should return complex value from context', () => {
    const ctx = {
      $env: {
        token: 'test',
      },
    } as unknown as TestContext;
    expect(getValueFromContext({ value: 'bearer {$env.token}', ctx, logger })).toEqual(
      'bearer test'
    );
  });

  it('should return multiple complex value from context', () => {
    const ctx = {
      $env: {
        token: 'test',
      },
      $faker: createFaker(),
    } as unknown as TestContext;
    expect(
      getValueFromContext({
        value: 'bearer {$env.token} {$faker.number.integer({min:5,max:5})}',
        ctx,
        logger,
      })
    ).toEqual('bearer test 5');
  });

  it('should return complex object string from context', () => {
    const ctx = {
      $env: {
        token: 'test',
      },
      $faker: createFaker(),
    } as unknown as TestContext;
    expect(
      getValueFromContext({
        value:
          '  "name": "respect-test-project-name-{$faker.number.integer({ min: 5, max: 5 })}::{$faker.number.integer({ min: 5, max: 5 })}",',
        ctx,
        logger,
      })
    ).toEqual('  "name": "respect-test-project-name-5::5",');
  });

  it('should return original value if can not resolve from context', () => {
    const ctx = {
      secret: {
        token: 'test',
      },
    } as unknown as TestContext;
    expect(getValueFromContext({ value: 'custom.domain.com', ctx, logger })).toEqual(
      'custom.domain.com'
    );
  });

  it('should return faker generated data', () => {
    const ctx = {
      $faker: createFaker(),
    } as unknown as TestContext;
    expect(
      getValueFromContext({ value: '$faker.number.integer({ min: 5, max: 5 })', ctx, logger })
    ).toEqual(5);
  });

  it('should return faker generated data with additional text', () => {
    const ctx = {
      $faker: createFaker(),
    } as unknown as TestContext;
    expect(
      getValueFromContext({
        value: 'number is {$faker.number.integer({min:5,max:5})}',
        ctx,
        logger,
      })
    ).toEqual('number is 5');
  });

  it('should return faker generated data', () => {
    const ctx = {
      $faker: createFaker(),
    } as unknown as TestContext;
    expect(
      getValueFromContext({ value: 'city is {$faker.address.city}', ctx, logger })
    ).not.toMatch('{$faker.address.city}');
  });

  it('should remove `$file` identifier from the value', () => {
    const ctx = {
      $faker: createFaker(),
    } as unknown as TestContext;
    expect(getValueFromContext({ value: "$file('./test.yaml')", ctx, logger })).toEqual(
      './test.yaml'
    );
  });

  // $sourceDescriptions.<name>.workflows.<workflowId>
  it('should return workflow from $sourceDescriptions', () => {
    const ctx = {
      $sourceDescriptions: {
        test: {
          workflows: [
            {
              workflowId: 'workflowTestId',
              steps: [],
            },
          ],
        },
      },
    } as unknown as TestContext;
    expect(
      getValueFromContext({
        value: '$sourceDescriptions.test.workflows.workflowTestId',
        ctx,
        logger,
      })
    ).toEqual({
      workflowId: 'workflowTestId',
      steps: [],
    });
  });

  it('should return undefined from $sourceDescriptions if there is no such sourceDescription', () => {
    const ctx = {
      $sourceDescriptions: {
        test: {
          workflows: [
            {
              workflowId: 'workflowTestId',
              steps: [],
            },
          ],
        },
      },
    } as unknown as TestContext;
    expect(
      getValueFromContext({
        value: '$sourceDescriptions.notExistingName.workflows.workflowTestId',
        ctx,
        logger,
      })
    ).toEqual(undefined);
  });

  it('should return undefined from $sourceDescriptions if there is no workflowId provided', () => {
    const ctx = {
      $sourceDescriptions: {
        test: {
          workflows: [
            {
              workflowId: 'workflowTestId',
              steps: [],
            },
          ],
        },
      },
    } as unknown as TestContext;
    expect(
      getValueFromContext({ value: '$sourceDescriptions.notExistingName.workflows.', ctx, logger })
    ).toEqual(undefined);
  });

  it('should return undefined if getFakeData had error resolving value', () => {
    const ctx = {
      $sourceDescriptions: {
        test: {
          workflows: [
            {
              workflowId: 'workflowTestId',
              steps: [],
            },
          ],
        },
      },
    } as unknown as TestContext;
    expect(getValueFromContext({ value: '{$faker.city}', ctx, logger })).toEqual('undefined');
  });
});

describe('parsePath', () => {
  it('should return path params', () => {
    const path = 'https://api.com/user/{id}/profile';
    expect(
      resolvePath(path, {
        id: 'test',
      })
    ).toEqual('https://api.com/user/test/profile');
  });

  it('should return same string if no path params', () => {
    const path = 'https://api.com/user/profile';
    expect(resolvePath(path, {})).toEqual('https://api.com/user/profile');
  });

  it('should return undefined if no path provided', () => {
    expect(resolvePath(undefined, {})).toBeUndefined();
  });
});

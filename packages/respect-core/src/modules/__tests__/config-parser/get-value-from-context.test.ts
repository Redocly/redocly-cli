import { logger } from '@redocly/openapi-core';

import type { TestContext } from '../../../types.js';
import { getValueFromContext, resolvePath } from '../../context-parser/index.js';
import { createFaker } from '../../faker.js';

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

  it('should not execute arbitrary code via the $faker constructor escape', () => {
    const ctx = {
      $faker: createFaker(),
    } as unknown as TestContext;
    (globalThis as any).__respectPwned = false;
    const payload =
      '$faker.constructor.constructor(\'globalThis["__respectPwned"]=true;return 1\')()';

    const result = getValueFromContext({ value: payload, ctx, logger });

    expect((globalThis as any).__respectPwned).toBe(false);
    expect(result).toBeUndefined();
    delete (globalThis as any).__respectPwned;
  });

  it('should not execute arbitrary code via bracket-notation $faker payloads', () => {
    const ctx = {
      $faker: createFaker(),
    } as unknown as TestContext;
    (globalThis as any).__respectPwned2 = false;
    const payload =
      '$faker.string["constructor"]["constructor"](\'globalThis["__respectPwned2"]=true\')()';

    const result = getValueFromContext({ value: payload, ctx, logger });

    expect((globalThis as any).__respectPwned2).toBe(false);
    expect(result).toBeUndefined();
    delete (globalThis as any).__respectPwned2;
  });

  it('should not resolve prototype-chain properties via $faker', () => {
    const ctx = {
      $faker: createFaker(),
    } as unknown as TestContext;

    expect(
      getValueFromContext({ value: '$faker.__proto__.polluted', ctx, logger })
    ).toBeUndefined();
    expect(getValueFromContext({ value: '$faker.constructor', ctx, logger })).toBeUndefined();
  });
});

describe('getFakeData argument parsing', () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = {
      $faker: createFaker(),
    } as unknown as TestContext;
  });

  it('parses float arguments without being mangled by dots in the pointer', () => {
    const result = getValueFromContext({
      value: '$faker.number.float({ min: 0.5, max: 1.5 })',
      ctx,
      logger,
    }) as number;
    expect(result).toBeGreaterThanOrEqual(0.5);
    expect(result).toBeLessThanOrEqual(1.5);
  });

  it('parses negative numbers', () => {
    const result = getValueFromContext({
      value: '$faker.number.integer({ min: -5, max: -1 })',
      ctx,
      logger,
    }) as number;
    expect(result).toBeGreaterThanOrEqual(-5);
    expect(result).toBeLessThanOrEqual(-1);
  });

  it('parses string arguments and dotted values', () => {
    expect(
      getValueFromContext({
        value: "$faker.string.email({ provider: 'example', domain: 'org' })",
        ctx,
        logger,
      })
    ).toContain('example.org');
  });

  it('tolerates trailing commas', () => {
    expect(
      getValueFromContext({ value: '$faker.number.integer({ min: 5, max: 5, })', ctx, logger })
    ).toEqual(5);
  });

  it('strips prototype-polluting keys from parsed argument objects', () => {
    expect(
      getValueFromContext({
        value: '$faker.number.integer({ __proto__: { polluted: 1 }, min: 5, max: 5 })',
        ctx,
        logger,
      })
    ).toEqual(5);
    expect(({} as any).polluted).toBeUndefined();
  });

  it('supports calls with no arguments', () => {
    expect(getValueFromContext({ value: '$faker.string.uuid()', ctx, logger })).toEqual(
      expect.any(String)
    );
  });

  it('returns undefined for malformed argument lists', () => {
    expect(
      getValueFromContext({ value: '$faker.number.integer({ min: })', ctx, logger })
    ).toBeUndefined();
    expect(
      getValueFromContext({ value: "$faker.string.email('unterminated)", ctx, logger })
    ).toBeUndefined();
    expect(getValueFromContext({ value: '$faker.number.integer(@)', ctx, logger })).toBeUndefined();
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

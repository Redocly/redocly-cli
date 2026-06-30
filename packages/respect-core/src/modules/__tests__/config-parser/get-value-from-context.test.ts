import type { TestContext } from '../../../types';

import { createFaker } from '../../faker';
import { getValueFromContext, resolvePath } from '../../config-parser';

describe('getValueFromContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return value from context', () => {
    const ctx = {
      $some: 'test',
    } as unknown as TestContext;
    expect(getValueFromContext('$some', ctx)).toEqual('test');
  });

  it('should return custom list of objects value', () => {
    const ctx = {
      $some: 'John Wick',
    } as unknown as TestContext;
    expect(getValueFromContext([{ name: '$some' }, { name: 'Jonny Mnemonic' }], ctx)).toEqual([
      { name: 'John Wick' },
      { name: 'Jonny Mnemonic' },
    ]);
  });

  it('should return custom list value', () => {
    const ctx = {
      $some: 'John Wick',
    } as unknown as TestContext;
    expect(getValueFromContext(['Jonny Mnemonic', 'John Wick'], ctx)).toEqual([
      'Jonny Mnemonic',
      'John Wick',
    ]);
  });

  it('should return custom object value', () => {
    const ctx = {
      $some: 'John',
    } as unknown as TestContext;
    expect(getValueFromContext({ name: '$some', lastname: 'Mnemonic' }, ctx)).toEqual({
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
    expect(getValueFromContext('bearer {$env.token}', ctx)).toEqual('bearer test');
  });

  it('should return multiple complex value from context', () => {
    const ctx = {
      $env: {
        token: 'test',
      },
      $faker: createFaker(),
    } as unknown as TestContext;
    expect(
      getValueFromContext('bearer {$env.token} {$faker.number.integer({min:5,max:5})}', ctx)
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
      getValueFromContext(
        '  "name": "respect-test-project-name-{$faker.number.integer({ min: 5, max: 5 })}::{$faker.number.integer({ min: 5, max: 5 })}",',
        ctx
      )
    ).toEqual('  "name": "respect-test-project-name-5::5",');
  });

  it('should return original value if can not resolve from context', () => {
    const ctx = {
      secret: {
        token: 'test',
      },
    } as unknown as TestContext;
    expect(getValueFromContext('custom.domain.com', ctx)).toEqual('custom.domain.com');
  });

  it('should return faker generated data', () => {
    const ctx = {
      $faker: createFaker(),
    } as unknown as TestContext;
    expect(getValueFromContext('$faker.number.integer({ min: 5, max: 5 })', ctx)).toEqual(5);
  });

  it('should return faker generated data with additional text', () => {
    const ctx = {
      $faker: createFaker(),
    } as unknown as TestContext;
    expect(getValueFromContext('number is {$faker.number.integer({min:5,max:5})}', ctx)).toEqual(
      'number is 5'
    );
  });

  it('should return faker generated data', () => {
    const ctx = {
      $faker: createFaker(),
    } as unknown as TestContext;
    expect(getValueFromContext('city is {$faker.address.city}', ctx)).not.toMatch(
      '{$faker.address.city}'
    );
  });

  it('should remove `$file` identifier from the value', () => {
    const ctx = {
      $faker: createFaker(),
    } as unknown as TestContext;
    expect(getValueFromContext("$file('./test.yaml')", ctx)).toEqual('./test.yaml');
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
    expect(getValueFromContext('$sourceDescriptions.test.workflows.workflowTestId', ctx)).toEqual({
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
      getValueFromContext('$sourceDescriptions.notExistingName.workflows.workflowTestId', ctx)
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
    expect(getValueFromContext('$sourceDescriptions.notExistingName.workflows.', ctx)).toEqual(
      undefined
    );
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
    expect(getValueFromContext('{$faker.city}', ctx)).toEqual('undefined');
  });

  it('should not execute arbitrary code via the $faker constructor escape', () => {
    const ctx = {
      $faker: createFaker(),
    } as any;
    (globalThis as any).__respectPwned = false;
    const payload =
      '$faker.constructor.constructor(\'globalThis["__respectPwned"]=true;return 1\')()';

    const result = getValueFromContext(payload, ctx);

    expect((globalThis as any).__respectPwned).toBe(false);
    expect(result).toBeUndefined();
    delete (globalThis as any).__respectPwned;
  });

  it('should not execute arbitrary code via bracket-notation $faker payloads', () => {
    const ctx = {
      $faker: createFaker(),
    } as any;
    (globalThis as any).__respectPwned2 = false;
    const payload =
      '$faker.string["constructor"]["constructor"](\'globalThis["__respectPwned2"]=true\')()';

    const result = getValueFromContext(payload, ctx);

    expect((globalThis as any).__respectPwned2).toBe(false);
    expect(result).toBeUndefined();
    delete (globalThis as any).__respectPwned2;
  });

  it('should not resolve prototype-chain properties via $faker', () => {
    const ctx = {
      $faker: createFaker(),
    } as any;

    expect(getValueFromContext('$faker.__proto__.polluted', ctx)).toBeUndefined();
    expect(getValueFromContext('$faker.constructor', ctx)).toBeUndefined();
  });
});

describe('getFakeData argument parsing', () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = {
      $faker: createFaker(),
    } as any;
  });

  it('parses float arguments without being mangled by dots in the pointer', () => {
    const result = getValueFromContext(
      '$faker.number.float({ min: 0.5, max: 1.5 })',
      ctx
    );
    expect(result).toBeGreaterThanOrEqual(0.5);
    expect(result).toBeLessThanOrEqual(1.5);
  });

  it('parses negative numbers', () => {
    const result = getValueFromContext(
      '$faker.number.integer({ min: -5, max: -1 })',
      ctx
    );
    expect(result).toBeGreaterThanOrEqual(-5);
    expect(result).toBeLessThanOrEqual(-1);
  });

  it('parses string arguments and dotted values', () => {
    expect(
      getValueFromContext("$faker.string.email({ provider: 'example', domain: 'org' })", ctx)
    ).toContain('example.org');
  });

  it('supports calls with no arguments', () => {
    expect(getValueFromContext('$faker.string.uuid()', ctx)).toEqual(expect.any(String));
  });

  it('returns undefined for malformed argument lists', () => {
    expect(getValueFromContext('$faker.number.integer({ min: })', ctx)).toBeUndefined();
    expect(getValueFromContext("$faker.string.email('unterminated)", ctx)).toBeUndefined();
    expect(getValueFromContext('$faker.number.integer(@)', ctx)).toBeUndefined();
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

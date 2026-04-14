import { getTarget, resolveConfigForTarget } from '../targets-handler/targets-handler.js';

describe('getTarget', () => {
  it('should return undefined when no targets provided', () => {
    expect(getTarget(undefined, { env: 'prod' })).toBeUndefined();
  });

  it('should return undefined when no target matches', () => {
    const targets = [{ where: { metadata: { env: 'prod' } } }];
    expect(getTarget(targets, { env: 'staging' })).toBeUndefined();
  });

  it('should return matching target with exact string equality', () => {
    const targets = [
      { where: { metadata: { env: 'staging' } } },
      { where: { metadata: { env: 'prod' } }, minimumLevel: 'Gold' },
    ];
    const result = getTarget(targets, { env: 'prod' });
    expect(result).toBe(targets[1]);
  });

  it('should return first matching target', () => {
    const targets = [
      { where: { metadata: { env: 'prod' } }, minimumLevel: 'Silver' },
      { where: { metadata: { env: 'prod' } }, minimumLevel: 'Gold' },
    ];
    expect(getTarget(targets, { env: 'prod' })!.minimumLevel).toBe('Silver');
  });

  it('should match target using regex pattern', () => {
    const targets = [
      { where: { metadata: { version: '/^1\\.[0-9]+\\.[0-9]+/' } }, minimumLevel: 'Silver' },
    ];
    expect(getTarget(targets, { version: '1.2.3' })!.minimumLevel).toBe('Silver');
  });

  it('should throws an error when regex pattern is invalid', () => {
    const targets = [
      { where: { metadata: { version: '/^(1\\.[0-9]+\\.[0-9]+/' } }, minimumLevel: 'Silver' },
    ];

    expect(getTarget(targets, { version: '1.2.3' })).toBeUndefined();
  });

  it('should not match target when regex does not match', () => {
    const targets = [{ where: { metadata: { version: '/^1\\.[0-9]+\\.[0-9]+/' } } }];
    expect(getTarget(targets, { version: '2.0.0' })).toBeUndefined();
  });

  it('should match target using ISO 8601 date range', () => {
    const targets = [
      { where: { metadata: { publishedAt: '2024-01-01/2025-12-31' } }, minimumLevel: 'Gold' },
    ];
    expect(getTarget(targets, { publishedAt: '2024-06-15' })!.minimumLevel).toBe('Gold');
  });

  it('should not match target when date is outside range', () => {
    const targets = [{ where: { metadata: { publishedAt: '2024-01-01/2024-12-31' } } }];
    expect(getTarget(targets, { publishedAt: '2025-01-01' })).toBeUndefined();
  });

  it('should not match when metadata key is missing for date range or regex', () => {
    const dateTarget = [
      { where: { metadata: { publishedAt: '2024-01-01/2025-12-31' } }, minimumLevel: 'Gold' },
    ];
    expect(getTarget(dateTarget, {})).toBeUndefined();

    const regexTarget = [{ where: { metadata: { version: '/^1\\.0/' } }, minimumLevel: 'Silver' }];
    expect(getTarget(regexTarget, {})).toBeUndefined();
  });

  it('should match all conditions in where.metadata', () => {
    const targets = [
      {
        where: { metadata: { title: 'My API', env: 'prod' } },
        minimumLevel: 'Gold',
      },
    ];

    expect(getTarget(targets, { title: 'My API' })).toBeUndefined();

    expect(getTarget(targets, { title: 'My API', env: 'prod' })!.minimumLevel).toBe('Gold');
  });
});

describe('resolveConfigForTarget', () => {
  it('should return a config entry for each level', async () => {
    const levels = [{ name: 'Baseline' }, { name: 'Silver' }];
    const result = await resolveConfigForTarget('test.yaml', undefined, levels, [], '');

    expect(Object.keys(result)).toEqual(['Baseline', 'Silver']);
  });

  it('should override level rules with target rules when targetRules provided', async () => {
    const levels = [{ name: 'Baseline', rules: { 'operation-summary': 'error' } }];
    const targetRules = { 'operation-summary': 'warn' };

    const result = await resolveConfigForTarget('test.yaml', targetRules, levels, [], '');

    expect(result.Baseline.rules['oas3_1']['operation-summary']).toBe('warn');
  });

  it('should return different rules for different levels', async () => {
    const levels = [
      { name: 'Baseline', rules: { 'operation-summary': 'error' } },
      { name: 'Silver', rules: { 'operation-summary': 'warn' } },
    ];

    const result = await resolveConfigForTarget('test.yaml', undefined, levels, [], '');

    expect(result.Baseline.rules['oas3_1']['operation-summary']).toBe('error');
    expect(result.Silver.rules['oas3_1']['operation-summary']).toBe('warn');
  });

  it('should override severity of level configurable rule', async () => {
    const levels = [
      {
        name: 'Baseline',
        rules: {
          'response-contains-header': {
            severity: 'error',
            names: { '2XX': ['X-Rate-Limit'] },
            message: 'Responses must include X-Rate-Limit header',
          },
        },
      },
    ];

    const targetRules = { 'response-contains-header': 'warn' };

    const result = await resolveConfigForTarget('test.yaml', targetRules, levels, [], '');

    expect(result.Baseline.rules['oas3_1']['response-contains-header']).toEqual({
      severity: 'warn',
      names: { '2XX': ['X-Rate-Limit'] },
      message: 'Responses must include X-Rate-Limit header',
    });
  });

  it('should override severity of level configurable rule for every level', async () => {
    const levels = [
      {
        name: 'Baseline',
        rules: {
          'response-contains-header': {
            severity: 'error',
            names: { '2XX': ['X-Rate-Limit'] },
            message: 'Responses must include X-Rate-Limit header',
          },
        },
      },
      {
        name: 'Silver',
        rules: {
          'response-contains-header': {
            severity: 'error',
            names: { '2XX': ['X-Rate-Limit'] },
            message: 'Responses must include X-Rate-Limit header',
          },
        },
      },
    ];

    const targetRules = { 'response-contains-header': 'warn' };

    const result = await resolveConfigForTarget('test.yaml', targetRules, levels, [], '');

    expect(result.Baseline.rules['oas3_1']['response-contains-header']).toEqual({
      severity: 'warn',
      names: { '2XX': ['X-Rate-Limit'] },
      message: 'Responses must include X-Rate-Limit header',
    });

    expect(result.Silver.rules['oas3_1']['response-contains-header']).toEqual({
      severity: 'warn',
      names: { '2XX': ['X-Rate-Limit'] },
      message: 'Responses must include X-Rate-Limit header',
    });
  });

  it('should return undefined when no target matches', () => {
    const scorecardConfig = {
      levels: [{ name: 'Baseline' }],
      targets: [{ where: { metadata: { env: 'prod' } }, minimumLevel: 'Gold' }],
    };
    expect(getTarget(scorecardConfig.targets, { env: 'dev' })?.minimumLevel).toBeUndefined();
  });

  it('should return minimumLevel from matching target', () => {
    const scorecardConfig = {
      levels: [{ name: 'Baseline' }],
      targets: [{ where: { metadata: { env: 'prod' } }, minimumLevel: 'Gold' }],
    };
    expect(getTarget(scorecardConfig.targets, { env: 'prod' })!.minimumLevel).toBe('Gold');
  });
});

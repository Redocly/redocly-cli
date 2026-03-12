import * as openapiCore from '@redocly/openapi-core';

import {
  getTarget,
  getTargetLevel,
  resolveLevelsConfig,
  resolveConfigForTarget,
} from '../targets-handler/targets-handler.js';

describe('getTarget', () => {
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
    expect(getTarget(targets, { env: 'prod' })?.minimumLevel).toBe('Silver');
  });

  it('should match target using regex pattern', () => {
    const targets = [
      { where: { metadata: { version: '/^1\\.[0-9]+\\.[0-9]+/' } }, minimumLevel: 'Silver' },
    ];
    expect(getTarget(targets, { version: '1.2.3' })?.minimumLevel).toBe('Silver');
  });

  it('should not match target when regex does not match', () => {
    const targets = [{ where: { metadata: { version: '/^1\\.[0-9]+\\.[0-9]+/' } } }];
    expect(getTarget(targets, { version: '2.0.0' })).toBeUndefined();
  });

  it('should match target using ISO 8601 date range', () => {
    const targets = [
      { where: { metadata: { publishedAt: '2024-01-01/2025-12-31' } }, minimumLevel: 'Gold' },
    ];
    expect(getTarget(targets, { publishedAt: '2024-06-15' })?.minimumLevel).toBe('Gold');
  });

  it('should not match target when date is outside range', () => {
    const targets = [{ where: { metadata: { publishedAt: '2024-01-01/2024-12-31' } } }];
    expect(getTarget(targets, { publishedAt: '2025-01-01' })).toBeUndefined();
  });

  it('should match all conditions in where.metadata', () => {
    const targets = [
      {
        where: { metadata: { title: 'My API', env: 'prod' } },
        minimumLevel: 'Gold',
      },
    ];

    expect(getTarget(targets, { title: 'My API' })).toBeUndefined();

    expect(getTarget(targets, { title: 'My API', env: 'prod' })?.minimumLevel).toBe('Gold');
  });
});

describe('getTargetLevel', () => {
  it('should return undefined when no target matches', () => {
    const scorecardConfig = {
      levels: [{ name: 'Baseline' }],
      targets: [{ where: { metadata: { env: 'prod' } }, minimumLevel: 'Gold' }],
    };
    expect(getTargetLevel(scorecardConfig, { env: 'dev' })).toBeUndefined();
  });

  it('should return minimumLevel from matching target', () => {
    const scorecardConfig = {
      levels: [{ name: 'Baseline' }],
      targets: [{ where: { metadata: { env: 'prod' } }, minimumLevel: 'Gold' }],
    };
    expect(getTargetLevel(scorecardConfig, { env: 'prod' })).toBe('Gold');
  });
});

describe('resolveLevelsConfig', () => {
  beforeEach(() => {
    vi.spyOn(openapiCore, 'createConfig').mockResolvedValue({} as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return a config entry for each level', async () => {
    const levels = [
      { name: 'Baseline', rules: { 'operation-summary': 'error' } },
      { name: 'Silver', rules: { 'operation-summary': 'error' } },
    ];

    const result = await resolveLevelsConfig(levels as any, [], '');

    expect(Object.keys(result)).toEqual(['Baseline', 'Silver']);
    expect(openapiCore.createConfig).toHaveBeenCalledTimes(2);
  });

  it('should pass plugins to createConfig', async () => {
    const levels = [{ name: 'Baseline', rules: {} }];

    await resolveLevelsConfig(levels as any, ['my-plugin'], '/path/to/config');

    expect(openapiCore.createConfig).toHaveBeenCalledWith(
      expect.objectContaining({ plugins: ['my-plugin'] }),
      { configPath: '/path/to/config' }
    );
  });
});

describe('resolveConfigForTarget', () => {
  function makeMockConfig(rules: Record<string, unknown>) {
    return {
      rules: {
        oas3_0: { ...rules },
        oas3_1: { ...rules },
        oas2: { ...rules },
        oas3_2: { ...rules },
        async2: { ...rules },
        async3: { ...rules },
        arazzo1: { ...rules },
        overlay1: { ...rules },
        openrpc1: { ...rules },
      },
      resolvedConfig: {
        rules: { ...rules },
        oas2Rules: {},
        oas3_0Rules: {},
        oas3_1Rules: {},
        oas3_2Rules: {},
        async2Rules: {},
        async3Rules: {},
        arazzo1Rules: {},
        overlay1Rules: {},
        openrpc1Rules: {},
        preprocessors: {},
        decorators: {},
      },
      configPath: '',
      plugins: [],
    };
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return configs without modification when targetRules is undefined', async () => {
    vi.spyOn(openapiCore, 'createConfig').mockResolvedValue(
      makeMockConfig({ 'operation-summary': 'error' }) as any
    );

    const levels = [{ name: 'Baseline' }];
    const result = await resolveConfigForTarget(undefined, levels, [], '');

    expect(Object.keys(result)).toEqual(['Baseline']);
    expect(result['Baseline'].rules.oas3_0['operation-summary']).toBe('error');
  });

  it('should override string rule severity with target rules in all spec versions', async () => {
    vi.spyOn(openapiCore, 'createConfig').mockResolvedValue(
      makeMockConfig({ 'response-contains-header': 'error' }) as any
    );

    const levels = [{ name: 'Baseline' }];
    const result = await resolveConfigForTarget(
      { 'response-contains-header': 'warn' },
      levels,
      [],
      ''
    );

    for (const specRules of Object.values(result['Baseline'].rules)) {
      expect((specRules as any)['response-contains-header']).toBe('warn');
    }
  });

  it('should merge severity into object rule config, preserving other fields', async () => {
    const baselineRule = {
      severity: 'error',
      names: { '2XX': ['x-api-server-version'] },
      message: '{{message}}',
    };
    vi.spyOn(openapiCore, 'createConfig').mockResolvedValue(
      makeMockConfig({ 'response-contains-header': baselineRule }) as any
    );

    const levels = [{ name: 'Baseline', extends: ['minimal', './@lint/baseline.yaml'] }];
    const result = await resolveConfigForTarget(
      { 'response-contains-header': 'warn' },
      levels,
      [],
      ''
    );

    const rule = result['Baseline'].rules.oas3_0['response-contains-header'] as any;
    expect(rule.severity).toBe('warn');
    expect(rule.names).toEqual({ '2XX': ['x-api-server-version'] });
    expect(rule.message).toBe('{{message}}');
  });

  it('should apply target rules to all levels', async () => {
    vi.spyOn(openapiCore, 'createConfig')
      .mockResolvedValueOnce(makeMockConfig({ 'operation-summary': { severity: 'error' } }) as any)
      .mockResolvedValueOnce(makeMockConfig({ 'operation-summary': { severity: 'error' } }) as any);

    const levels = [{ name: 'Baseline' }, { name: 'Silver' }];
    const result = await resolveConfigForTarget({ 'operation-summary': 'warn' }, levels, [], '');

    expect((result['Baseline'].rules.oas3_0['operation-summary'] as any).severity).toBe('warn');
    expect((result['Silver'].rules.oas3_0['operation-summary'] as any).severity).toBe('warn');
  });

  it('should not mutate the original levels array', async () => {
    vi.spyOn(openapiCore, 'createConfig').mockResolvedValue(makeMockConfig({}) as any);

    const levels = [{ name: 'Baseline', rules: { 'operation-summary': 'error' } }];
    const levelsCopy = JSON.parse(JSON.stringify(levels));

    await resolveConfigForTarget({ 'response-contains-header': 'warn' }, levels as any, [], '');

    expect(levels).toEqual(levelsCopy);
  });

  it('should merge severity into object rule when level has no extends (inline rules only)', async () => {
    const inlineRule = {
      severity: 'error',
      names: { '2XX': ['x-api-server-version'] },
      message: '{{message}}',
    };
    vi.spyOn(openapiCore, 'createConfig').mockResolvedValue(
      makeMockConfig({ 'response-contains-header': inlineRule }) as any
    );

    const levels = [
      {
        name: 'Silver',
        rules: {
          'response-contains-header': inlineRule,
        },
      },
    ];
    const result = await resolveConfigForTarget(
      { 'response-contains-header': 'warn' },
      levels as any,
      [],
      ''
    );

    const rule = result['Silver'].rules.oas3_0['response-contains-header'] as any;
    expect(rule.severity).toBe('warn');
    expect(rule.names).toEqual({ '2XX': ['x-api-server-version'] });
    expect(rule.message).toBe('{{message}}');
  });
});

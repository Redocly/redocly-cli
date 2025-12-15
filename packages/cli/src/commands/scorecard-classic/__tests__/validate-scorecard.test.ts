import { validateScorecard } from '../validation/validate-scorecard.js';
import * as openapiCore from '@redocly/openapi-core';
import { evaluatePluginsFromCode } from '../validation/plugin-evaluator.js';

vi.mock('../validation/plugin-evaluator.js', () => ({
  evaluatePluginsFromCode: vi.fn(),
}));

describe('validateScorecard', () => {
  const mockDocument = {
    parsed: {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {},
    },
    source: {
      absoluteRef: 'test.yaml',
    },
  } as any;

  const mockResolver = {} as any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(openapiCore, 'createConfig').mockResolvedValue({} as any);
    vi.spyOn(openapiCore, 'lintDocument').mockResolvedValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return empty array when no scorecard levels defined', async () => {
    const scorecardConfig = { levels: [] };

    const result = await validateScorecard(mockDocument, mockResolver, scorecardConfig);

    expect(result).toEqual({
      achievedLevel: 'Non Conformant',
      problems: [],
      targetLevelAchieved: true,
    });
    expect(openapiCore.lintDocument).not.toHaveBeenCalled();
  });

  it('should validate each scorecard level', async () => {
    const scorecardConfig = {
      levels: [
        { name: 'Baseline', rules: {} },
        { name: 'Gold', rules: {} },
      ],
    };

    await validateScorecard(mockDocument, mockResolver, scorecardConfig);

    expect(openapiCore.createConfig).toHaveBeenCalledTimes(2);
    expect(openapiCore.lintDocument).toHaveBeenCalledTimes(2);
  });

  it('should attach scorecard level name to problems', async () => {
    const scorecardConfig = {
      levels: [{ name: 'Gold', rules: {} }],
    };

    const mockProblems = [
      {
        message: 'Test error',
        ruleId: 'test-rule',
        severity: 'error',
        location: [],
        ignored: false,
      },
    ];

    vi.mocked(openapiCore.lintDocument).mockResolvedValue(mockProblems as any);

    const result = await validateScorecard(mockDocument, mockResolver, scorecardConfig);

    expect(result.problems).toHaveLength(1);
    expect(result.problems[0].scorecardLevel).toBe('Gold');
    expect(result.problems[0].message).toBe('Test error');
  });

  it('should filter out ignored problems', async () => {
    const scorecardConfig = {
      levels: [{ name: 'Baseline', rules: {} }],
    };

    const mockProblems = [
      {
        message: 'Error 1',
        ruleId: 'rule-1',
        severity: 'error',
        location: [],
        ignored: false,
      },
      {
        message: 'Error 2',
        ruleId: 'rule-2',
        severity: 'error',
        location: [],
        ignored: true,
      },
    ];

    vi.mocked(openapiCore.lintDocument).mockResolvedValue(mockProblems as any);

    const result = await validateScorecard(mockDocument, mockResolver, scorecardConfig);

    expect(result.problems).toHaveLength(1);
    expect(result.problems[0].message).toBe('Error 1');
  });

  it('should evaluate plugins from code when string provided', async () => {
    const scorecardConfig = {
      levels: [{ name: 'Gold', rules: {} }],
    };

    const mockPlugins = [{ id: 'test-plugin' }];
    vi.mocked(evaluatePluginsFromCode).mockResolvedValue(mockPlugins);

    await validateScorecard(mockDocument, mockResolver, scorecardConfig, undefined, 'plugin-code');

    expect(evaluatePluginsFromCode).toHaveBeenCalledWith('plugin-code', false);
    expect(openapiCore.createConfig).toHaveBeenCalledWith(
      expect.objectContaining({ plugins: mockPlugins }),
      expect.any(Object)
    );
  });

  it('should use plugins directly when array provided', async () => {
    const scorecardConfig = {
      levels: [{ name: 'Gold', rules: {} }],
    };

    const mockPlugins = [{ id: 'test-plugin' }];

    await validateScorecard(mockDocument, mockResolver, scorecardConfig, undefined, mockPlugins);

    expect(evaluatePluginsFromCode).not.toHaveBeenCalled();
    expect(openapiCore.createConfig).toHaveBeenCalledWith(
      expect.objectContaining({ plugins: mockPlugins }),
      expect.any(Object)
    );
  });

  it('should handle verbose flag', async () => {
    const scorecardConfig = {
      levels: [{ name: 'Gold', rules: {} }],
    };

    const mockPlugins = [{ id: 'test-plugin' }];
    vi.mocked(evaluatePluginsFromCode).mockResolvedValue(mockPlugins);

    await validateScorecard(
      mockDocument,
      mockResolver,
      scorecardConfig,
      undefined,
      'plugin-code',
      undefined,
      true
    );

    expect(evaluatePluginsFromCode).toHaveBeenCalledWith('plugin-code', true);
    expect(openapiCore.createConfig).toHaveBeenCalledWith(
      expect.objectContaining({ plugins: mockPlugins }),
      expect.any(Object)
    );
  });
});

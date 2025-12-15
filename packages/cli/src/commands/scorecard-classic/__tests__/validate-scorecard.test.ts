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

    const result = await validateScorecard({
      document: mockDocument,
      externalRefResolver: mockResolver,
      scorecardConfig,
    });

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

    await validateScorecard({
      document: mockDocument,
      externalRefResolver: mockResolver,
      scorecardConfig,
    });

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

    const result = await validateScorecard({
      document: mockDocument,
      externalRefResolver: mockResolver,
      scorecardConfig,
    });

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

    const result = await validateScorecard({
      document: mockDocument,
      externalRefResolver: mockResolver,
      scorecardConfig,
    });

    expect(result.problems).toHaveLength(1);
    expect(result.problems[0].message).toBe('Error 1');
  });

  it('should evaluate plugins from code when string provided', async () => {
    const scorecardConfig = {
      levels: [{ name: 'Gold', rules: {} }],
    };

    const mockPlugins = [{ id: 'test-plugin' }];
    vi.mocked(evaluatePluginsFromCode).mockResolvedValue(mockPlugins);

    await validateScorecard({
      document: mockDocument,
      externalRefResolver: mockResolver,
      scorecardConfig,
      pluginsCodeOrPlugins: 'plugin-code',
    });

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

    await validateScorecard({
      document: mockDocument,
      externalRefResolver: mockResolver,
      scorecardConfig,
      pluginsCodeOrPlugins: mockPlugins,
    });

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

    await validateScorecard({
      document: mockDocument,
      externalRefResolver: mockResolver,
      scorecardConfig,
      pluginsCodeOrPlugins: 'plugin-code',
      verbose: true,
    });

    expect(evaluatePluginsFromCode).toHaveBeenCalledWith('plugin-code', true);
    expect(openapiCore.createConfig).toHaveBeenCalledWith(
      expect.objectContaining({ plugins: mockPlugins }),
      expect.any(Object)
    );
  });

  describe('determineAchievedLevel', () => {
    it('should return highest level when all levels pass without problems', async () => {
      const scorecardConfig = {
        levels: [
          { name: 'Bronze', rules: {} },
          { name: 'Silver', rules: {} },
          { name: 'Gold', rules: {} },
        ],
      };

      vi.mocked(openapiCore.lintDocument).mockResolvedValue([]);

      const result = await validateScorecard({
        document: mockDocument,
        externalRefResolver: mockResolver,
        scorecardConfig,
      });

      expect(result.achievedLevel).toBe('Gold');
      expect(result.targetLevelAchieved).toBe(true);
    });

    it('should return previous level when current level has errors', async () => {
      const scorecardConfig = {
        levels: [
          { name: 'Bronze', rules: {} },
          { name: 'Silver', rules: {} },
          { name: 'Gold', rules: {} },
        ],
      };

      vi.mocked(openapiCore.lintDocument)
        .mockResolvedValueOnce([]) // Bronze: no problems
        .mockResolvedValueOnce([
          {
            message: 'Silver level error',
            ruleId: 'test-rule',
            severity: 'error',
            location: [],
            ignored: false,
          },
        ] as any); // Silver: has error

      const result = await validateScorecard({
        document: mockDocument,
        externalRefResolver: mockResolver,
        scorecardConfig,
      });

      expect(result.achievedLevel).toBe('Bronze');
      expect(result.problems).toHaveLength(1);
    });

    it('should return previous level when current level has warnings', async () => {
      const scorecardConfig = {
        levels: [
          { name: 'Bronze', rules: {} },
          { name: 'Silver', rules: {} },
        ],
      };

      vi.mocked(openapiCore.lintDocument)
        .mockResolvedValueOnce([]) // Bronze: no problems
        .mockResolvedValueOnce([
          {
            message: 'Silver level warning',
            ruleId: 'test-rule',
            severity: 'warn',
            location: [],
            ignored: false,
          },
        ] as any); // Silver: has warning

      const result = await validateScorecard({
        document: mockDocument,
        externalRefResolver: mockResolver,
        scorecardConfig,
      });

      expect(result.achievedLevel).toBe('Bronze');
      expect(result.problems).toHaveLength(1);
    });

    it('should return "Non Conformant" when first level has problems', async () => {
      const scorecardConfig = {
        levels: [
          { name: 'Bronze', rules: {} },
          { name: 'Silver', rules: {} },
        ],
      };

      vi.mocked(openapiCore.lintDocument).mockResolvedValue([
        {
          message: 'Bronze level error',
          ruleId: 'test-rule',
          severity: 'error',
          location: [],
          ignored: false,
        },
      ] as any);

      const result = await validateScorecard({
        document: mockDocument,
        externalRefResolver: mockResolver,
        scorecardConfig,
      });

      expect(result.achievedLevel).toBe('Non Conformant');
    });

    it('should return target level when specified and achieved', async () => {
      const scorecardConfig = {
        levels: [
          { name: 'Bronze', rules: {} },
          { name: 'Silver', rules: {} },
          { name: 'Gold', rules: {} },
        ],
      };

      vi.mocked(openapiCore.lintDocument).mockResolvedValue([]);

      const result = await validateScorecard({
        document: mockDocument,
        externalRefResolver: mockResolver,
        scorecardConfig,
        targetLevel: 'Silver',
      });

      expect(result.achievedLevel).toBe('Silver');
      expect(result.targetLevelAchieved).toBe(true);
    });

    it('should indicate target level not achieved when level has problems', async () => {
      const scorecardConfig = {
        levels: [
          { name: 'Bronze', rules: {} },
          { name: 'Silver', rules: {} },
        ],
      };

      vi.mocked(openapiCore.lintDocument)
        .mockResolvedValueOnce([]) // Bronze: no problems
        .mockResolvedValueOnce([
          {
            message: 'Silver level error',
            ruleId: 'test-rule',
            severity: 'error',
            location: [],
            ignored: false,
          },
        ] as any); // Silver: has error

      const result = await validateScorecard({
        document: mockDocument,
        externalRefResolver: mockResolver,
        scorecardConfig,
        targetLevel: 'Silver',
      });

      expect(result.achievedLevel).toBe('Bronze');
      expect(result.targetLevelAchieved).toBe(false);
    });
  });
});

import { printScorecardResults } from '../formatters/stylish-formatter.js';
import * as openapiCore from '@redocly/openapi-core';
import type { ScorecardProblem } from '../types.js';

const createMockSource = (absoluteRef: string) => ({
  absoluteRef,
  getAst: () => ({}),
  getRootAst: () => ({}),
  getLineColLocation: () => ({ line: 1, col: 1 }),
});

describe('printScorecardResults', () => {
  beforeEach(() => {
    vi.spyOn(openapiCore.logger, 'info').mockImplementation(() => {});
    vi.spyOn(openapiCore.logger, 'output').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should print success message when no problems', () => {
    printScorecardResults([]);

    expect(openapiCore.logger.info).toHaveBeenCalledWith(
      expect.stringMatching(/Found.*0.*error.*0.*warning.*0.*level/)
    );
  });

  it('should handle problems without location', () => {
    const problems: ScorecardProblem[] = [
      {
        message: 'Error without location',
        ruleId: 'test-rule',
        severity: 'error',
        suggest: [],
        location: [],
        scorecardLevel: 'Gold',
      },
    ];

    printScorecardResults(problems);

    expect(openapiCore.logger.output).toHaveBeenCalled();
    expect(openapiCore.logger.info).toHaveBeenCalledWith(
      expect.stringMatching(/Found.*1.*error.*0.*warning.*1.*level/)
    );
    expect(openapiCore.logger.info).toHaveBeenCalledWith(expect.stringContaining('📋 Gold'));
  });

  it('should handle problems with Unknown level', () => {
    const problems: ScorecardProblem[] = [
      {
        message: 'Error without level',
        ruleId: 'test-rule',
        severity: 'error',
        suggest: [],
        location: [],
        scorecardLevel: undefined,
      },
    ];

    printScorecardResults(problems);

    expect(openapiCore.logger.info).toHaveBeenCalledWith(expect.stringContaining('Unknown'));
  });

  it('should show correct severity counts per level', () => {
    const problems: ScorecardProblem[] = [
      {
        message: 'Error 1',
        ruleId: 'rule-1',
        severity: 'error',
        suggest: [],
        location: [],
        scorecardLevel: 'Gold',
      },
      {
        message: 'Error 2',
        ruleId: 'rule-2',
        severity: 'error',
        suggest: [],
        location: [],
        scorecardLevel: 'Gold',
      },
      {
        message: 'Warning 1',
        ruleId: 'rule-3',
        severity: 'warn',
        suggest: [],
        location: [],
        scorecardLevel: 'Gold',
      },
    ];

    printScorecardResults(problems);

    expect(openapiCore.logger.info).toHaveBeenCalledWith(
      expect.stringContaining('2 errors, 1 warnings')
    );
  });

  it('should calculate correct padding for alignment', () => {
    const problems: ScorecardProblem[] = [
      {
        message: 'Error 1',
        ruleId: 'short',
        severity: 'error',
        suggest: [],
        location: [
          {
            source: createMockSource('/test/file.yaml') as any,
            pointer: '#/paths/~1test/get',
            reportOnKey: false,
          },
        ],
        scorecardLevel: 'Gold',
      },
      {
        message: 'Error 2',
        ruleId: 'very-long-rule-id-name',
        severity: 'error',
        suggest: [],
        location: [
          {
            source: createMockSource('/test/file.yaml') as any,
            pointer: '#/info',
            reportOnKey: false,
          },
        ],
        scorecardLevel: 'Gold',
      },
    ];

    printScorecardResults(problems);

    expect(openapiCore.logger.output).toHaveBeenCalledTimes(2);
  });
});

import * as openapiCore from '@redocly/openapi-core';

import { printScorecardResults } from '../formatters/stylish-formatter.js';

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

    printScorecardResults(problems, 'Gold', true);

    expect(openapiCore.logger.info).toHaveBeenCalledWith(
      expect.stringMatching(/Found.*1.*error.*0.*warning.*1.*level/)
    );
    expect(openapiCore.logger.output).toHaveBeenCalledWith(
      expect.stringContaining('Achieved Level: ')
    );
    expect(openapiCore.logger.output).toHaveBeenCalledWith(expect.stringContaining('📋 Gold'));
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

    printScorecardResults(problems, 'Unknown', true);

    expect(openapiCore.logger.output).toHaveBeenCalledWith(expect.stringContaining('Unknown'));
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

    printScorecardResults(problems, 'Gold', true);

    expect(openapiCore.logger.output).toHaveBeenCalledWith(expect.stringContaining('📋 Gold'));
    expect(openapiCore.logger.output).toHaveBeenCalledWith(
      expect.stringMatching(/2.*error.*1.*warning/)
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

    printScorecardResults(problems, 'Gold', true);

    // Should have 4 calls: 1 for level header + 2 for problems + 1 for achieved level
    expect(openapiCore.logger.output).toHaveBeenCalledTimes(4);
  });
});

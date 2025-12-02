import { printScorecardResults } from '../formatters/stylish-formatter.js';
import * as openapiCore from '@redocly/openapi-core';

describe('printScorecardResults', () => {
  beforeEach(() => {
    vi.spyOn(openapiCore.logger, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should print success message when no problems', () => {
    printScorecardResults([], 'test.yaml');

    expect(openapiCore.logger.info).toHaveBeenCalledWith(
      expect.stringContaining('No issues found')
    );
  });

  it('should print results when problems exist', () => {
    const problems = [
      {
        message: 'Error 1',
        ruleId: 'rule-1',
        severity: 'error' as const,
        location: [],
        scorecardLevel: 'Gold',
      },
    ];

    printScorecardResults(problems as any, 'test.yaml');

    expect(openapiCore.logger.info).toHaveBeenCalled();
  });
});

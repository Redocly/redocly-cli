import { readFileSync, unlinkSync } from 'node:fs';
import { exportScorecardResultsToJson } from '../formatters/json-formatter.js';
import type { ScorecardProblem } from '../types.js';
import type { ScorecardJsonOutput } from '../formatters/json-formatter.js';

const createMockSource = (absoluteRef: string) => ({
  absoluteRef,
  getAst: () => ({}),
  getRootAst: () => ({}),
  getLineColLocation: () => ({ line: 1, col: 1 }),
});

describe('exportScorecardResultsToJson', () => {
  const testOutputPath = './test-scorecard-output.json';

  afterEach(() => {
    try {
      unlinkSync(testOutputPath);
    } catch {
      // File might not exist
    }
  });

  it('should export empty results when no problems', () => {
    exportScorecardResultsToJson([], testOutputPath);

    const output = JSON.parse(readFileSync(testOutputPath, 'utf-8')) as ScorecardJsonOutput;

    expect(output).toEqual({});
  });

  it('should group problems by scorecard level', () => {
    const problems: ScorecardProblem[] = [
      {
        message: 'Error in Gold level',
        ruleId: 'test-rule-1',
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
        message: 'Warning in Gold level',
        ruleId: 'test-rule-2',
        severity: 'warn',
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
      {
        message: 'Error in Silver level',
        ruleId: 'test-rule-3',
        severity: 'error',
        suggest: [],
        location: [],
        scorecardLevel: 'Silver',
      },
    ];

    exportScorecardResultsToJson(problems, testOutputPath);

    const output = JSON.parse(readFileSync(testOutputPath, 'utf-8')) as ScorecardJsonOutput;

    expect(Object.keys(output)).toEqual(['Gold', 'Silver']);
    expect(output.Gold.summary).toEqual({ errors: 1, warnings: 1 });
    expect(output.Gold.problems).toHaveLength(2);
    expect(output.Silver.summary).toEqual({ errors: 1, warnings: 0 });
    expect(output.Silver.problems).toHaveLength(1);
  });

  it('should include rule URLs for non-namespaced rules', () => {
    const problems: ScorecardProblem[] = [
      {
        message: 'Test error',
        ruleId: 'operation-summary',
        severity: 'error',
        suggest: [],
        location: [],
        scorecardLevel: 'Gold',
      },
    ];

    exportScorecardResultsToJson(problems, testOutputPath);

    const output = JSON.parse(readFileSync(testOutputPath, 'utf-8')) as ScorecardJsonOutput;

    expect(output.Gold.problems[0].ruleUrl).toBe(
      'https://redocly.com/docs/cli/rules/oas/operation-summary.md'
    );
  });

  it('should not include rule URLs for namespaced rules', () => {
    const problems: ScorecardProblem[] = [
      {
        message: 'Test error',
        ruleId: 'custom/my-rule',
        severity: 'error',
        suggest: [],
        location: [],
        scorecardLevel: 'Gold',
      },
    ];

    exportScorecardResultsToJson(problems, testOutputPath);

    const output = JSON.parse(readFileSync(testOutputPath, 'utf-8')) as ScorecardJsonOutput;

    expect(output.Gold.problems[0].ruleUrl).toBeUndefined();
  });

  it('should format location with file path and range', () => {
    const problems: ScorecardProblem[] = [
      {
        message: 'Test error',
        ruleId: 'test-rule',
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
    ];

    exportScorecardResultsToJson(problems, testOutputPath);

    const output = JSON.parse(readFileSync(testOutputPath, 'utf-8')) as ScorecardJsonOutput;

    expect(output.Gold.problems[0].location).toHaveLength(1);
    expect(output.Gold.problems[0].location[0].file).toBe('/test/file.yaml');
    expect(output.Gold.problems[0].location[0].pointer).toBe('#/paths/~1test/get');
    expect(output.Gold.problems[0].location[0].range).toContain('Line');
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

    exportScorecardResultsToJson(problems, testOutputPath);

    const output = JSON.parse(readFileSync(testOutputPath, 'utf-8')) as ScorecardJsonOutput;

    expect(Object.keys(output)).toEqual(['Unknown']);
    expect(output.Unknown.problems).toHaveLength(1);
  });

  it('should strip ANSI codes from messages', () => {
    const problems: ScorecardProblem[] = [
      {
        message: '\u001b[31mError message with color\u001b[0m',
        ruleId: 'test-rule',
        severity: 'error',
        suggest: [],
        location: [],
        scorecardLevel: 'Gold',
      },
    ];

    exportScorecardResultsToJson(problems, testOutputPath);

    const output = JSON.parse(readFileSync(testOutputPath, 'utf-8')) as ScorecardJsonOutput;

    expect(output.Gold.problems[0].message).toBe('Error message with color');
    expect(output.Gold.problems[0].message).not.toContain('\u001b');
  });

  it('should count errors and warnings correctly', () => {
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
      {
        message: 'Warning 2',
        ruleId: 'rule-4',
        severity: 'warn',
        suggest: [],
        location: [],
        scorecardLevel: 'Gold',
      },
      {
        message: 'Warning 3',
        ruleId: 'rule-5',
        severity: 'warn',
        suggest: [],
        location: [],
        scorecardLevel: 'Gold',
      },
    ];

    exportScorecardResultsToJson(problems, testOutputPath);

    const output = JSON.parse(readFileSync(testOutputPath, 'utf-8')) as ScorecardJsonOutput;

    expect(output.Gold.summary.errors).toBe(2);
    expect(output.Gold.summary.warnings).toBe(3);
  });
});

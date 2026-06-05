import { formatProblems, getTotals } from '../format/format.js';
import { type Source } from '../resolve.js';
import { type LocationObject, type NormalizedProblem } from '../walk.js';

describe('format', () => {
  function replaceColors(log: string) {
    return log
      .replace(/\x1b\[33m(.*?)\x1b\[39m/g, '<o>$1</o>') // orange
      .replace(/\x1b\[31m(.*?)\x1b\[39m/g, '<r>$1</r>'); // red
  }

  const problems = [
    {
      ruleId: 'struct',
      location: [],
      severity: 'error' as const,
      message: 'message',
      suggest: [],
    },
    {
      ruleId: 'struct',
      location: [],
      severity: 'error' as const,
      message: 'message 2',
      suggest: [],
    },
    {
      ruleId: 'other-rule',
      location: [],
      severity: 'warn' as const,
      message: 'message',
      suggest: [],
    },
  ];

  let output = '';
  beforeEach(() => {
    output = '';
    vi.spyOn(process.stderr, 'write').mockImplementation((str: string | Uint8Array) => {
      output += str;
      return true;
    });
    vi.spyOn(process.stdout, 'write').mockImplementation((str: string | Uint8Array) => {
      output += str;
      return true;
    });
  });

  it('should correctly format summary output', () => {
    formatProblems(problems, {
      format: 'summary',
      version: '1.0.0',
      totals: getTotals(problems),
      color: false,
    });

    expect(output).toMatchInlineSnapshot(`
      "error   struct: 2
      warning other-rule: 1

      "
    `);
  });

  it('should correctly format summary output in color mode', () => {
    formatProblems(problems, {
      format: 'summary',
      version: '1.0.0',
      totals: getTotals(problems),
      color: true,
    });

    expect(replaceColors(output)).toMatchInlineSnapshot(`
      "<r>error  </r> struct: 2
      <o>warning</o> other-rule: 1

      "
    `);
  });

  it('should format problems using github-actions', () => {
    const problems = [
      {
        ruleId: 'struct',
        message: 'message',
        severity: 'error' as const,
        location: [
          {
            source: { absoluteRef: 'openapi.yaml' } as Source,
            start: { line: 1, col: 2 },
            end: { line: 3, col: 4 },
          } as LocationObject,
        ],
        suggest: [],
      },
    ];

    formatProblems(problems, {
      format: 'github-actions',
      version: '1.0.0',
      totals: getTotals(problems),
    });

    expect(output).toEqual(
      '::error title=struct,file=openapi.yaml,line=1,col=2,endLine=3,endColumn=4::message\n'
    );
  });

  it('should format problems using markdown', () => {
    const problems = [
      {
        ruleId: 'struct',
        message: 'message',
        severity: 'error' as const,
        location: [
          {
            source: { absoluteRef: 'openapi.yaml' } as Source,
            start: { line: 1, col: 2 },
            end: { line: 3, col: 4 },
          } as LocationObject,
        ],
        suggest: [],
      },
    ];

    formatProblems(problems, {
      format: 'markdown',
      version: '1.0.0',
      totals: getTotals(problems),
    });

    expect(output).toMatchInlineSnapshot(`
      "## Lint: openapi.yaml

      | Severity | Location | Problem | Message |
      |---|---|---|---|
      | error | line 1:2 | [struct](https://redocly.com/docs/cli/rules/struct/) | message |

      Validation failed
      Errors: 1

      "
    `);
  });

  it('should replace newlines with <br> in markdown messages', () => {
    const problems: NormalizedProblem[] = [
      {
        ruleId: 'multiline-rule',
        severity: 'error',
        message:
          "multiline-rule filed because the Response  didn't meet the assertions: \n- Response does not describe header Deprecation\n- Response does not describe header Sunset",
        location: [
          {
            source: { absoluteRef: 'openapi.yaml' } as Source,
            start: { line: 10, col: 5 },
            end: { line: 10, col: 15 },
          } as LocationObject,
        ],
        suggest: [],
      },
    ];

    formatProblems(problems, {
      format: 'markdown',
      version: '2.0.0',
      totals: getTotals(problems),
    });

    expect(output).toMatchInlineSnapshot(`
      "## Lint: openapi.yaml

      | Severity | Location | Problem | Message |
      |---|---|---|---|
      | error | line 10:5 | [multiline-rule](https://redocly.com/docs/cli/rules/multiline-rule/) | multiline-rule filed because the Response  didn't meet the assertions: <br>- Response does not describe header Deprecation<br>- Response does not describe header Sunset |

      Validation failed
      Errors: 1

      "
    `);
  });

  it('should format problems with suggestions in github-actions format', () => {
    const problems = [
      {
        ruleId: 'invalid-property',
        message: 'Property is invalid',
        severity: 'error' as const,
        location: [
          {
            source: { absoluteRef: 'openapi.yaml' } as Source,
            start: { line: 5, col: 10 },
            end: { line: 5, col: 20 },
          } as LocationObject,
        ],
        suggest: ['validProperty', 'anotherValidProperty', 'oneMoreProperty'],
      },
    ];

    formatProblems(problems, {
      format: 'github-actions',
      version: '1.0.0',
      totals: getTotals(problems),
    });

    expect(output).toMatchInlineSnapshot(`
      "::error title=invalid-property,file=openapi.yaml,line=5,col=10,endLine=5,endColumn=20::Property is invalid%0A%0ADid you mean:%0A  - validProperty%0A  - anotherValidProperty%0A  - oneMoreProperty%0A%0A
      "
    `);
  });

  it('should include reference URL in github-actions format', () => {
    const problems: NormalizedProblem[] = [
      {
        ruleId: 'struct',
        message: 'Operation must include a request body',
        severity: 'error' as const,
        location: [
          {
            source: { absoluteRef: 'openapi.yaml' } as Source,
            start: { line: 1, col: 2 },
            end: { line: 3, col: 4 },
          } as LocationObject,
        ],
        suggest: [],
        reference: 'https://wiki.example.com/api-guidelines#request-bodies',
      },
    ];

    formatProblems(problems, {
      format: 'github-actions',
      version: '1.0.0',
      totals: getTotals(problems),
    });

    expect(output).toEqual(
      '::error title=struct,file=openapi.yaml,line=1,col=2,endLine=3,endColumn=4::Operation must include a request body%0A%0AReference: https://wiki.example.com/api-guidelines#request-bodies%0A%0A\n'
    );
  });

  it('should render both suggestions and reference with single separator in github-actions format', () => {
    const problems: NormalizedProblem[] = [
      {
        ruleId: 'operation-id',
        message: 'Operation ID is required',
        severity: 'error' as const,
        location: [
          {
            source: { absoluteRef: 'openapi.yaml' } as Source,
            start: { line: 1, col: 2 },
            end: { line: 3, col: 4 },
          } as LocationObject,
        ],
        suggest: ['addOperation'],
        reference: 'https://wiki.example.com/api-guidelines#operation-id',
      },
    ];

    formatProblems(problems, {
      format: 'github-actions',
      version: '1.0.0',
      totals: getTotals(problems),
    });

    expect(output).toEqual(
      '::error title=operation-id,file=openapi.yaml,line=1,col=2,endLine=3,endColumn=4::Operation ID is required%0A%0ADid you mean: addOperation ?%0A%0AReference: https://wiki.example.com/api-guidelines#operation-id%0A%0A\n'
    );
  });

  it('should limit suggestions based on REDOCLY_CLI_LINT_MAX_SUGGESTIONS constant', () => {
    const problems: NormalizedProblem[] = [
      {
        ruleId: 'test-rule',
        message: 'Test message',
        severity: 'error' as const,
        location: [
          {
            source: { absoluteRef: 'test.yaml' } as Source,
            start: { line: 1, col: 1 },
            end: { line: 1, col: 10 },
          } as LocationObject,
        ],
        suggest: [
          'suggestion1',
          'suggestion2',
          'suggestion3',
          'suggestion4',
          'suggestion5',
          'suggestion6',
          'suggestion7',
          'suggestion8',
          'suggestion9',
          'suggestion10',
        ],
      },
    ];

    formatProblems(problems, {
      format: 'github-actions',
      version: '1.0.0',
      totals: getTotals(problems),
    });

    expect(output).toMatchInlineSnapshot(`
      "::error title=test-rule,file=test.yaml,line=1,col=1,endLine=1,endColumn=10::Test message%0A%0ADid you mean:%0A  - suggestion1%0A  - suggestion2%0A  - suggestion3%0A  - suggestion4%0A  - suggestion5%0A%0A
      "
    `);
  });

  it('should map errors to <error> and warnings to <failure> in junit format', () => {
    const problems: NormalizedProblem[] = [
      {
        ruleId: 'struct',
        message: 'message',
        severity: 'error',
        location: [
          {
            source: { absoluteRef: 'openapi.yaml' } as Source,
            start: { line: 1, col: 2 },
            end: { line: 3, col: 4 },
          } as LocationObject,
        ],
        suggest: [],
      },
      {
        ruleId: 'other-rule',
        message: 'a warning',
        severity: 'warn',
        location: [
          {
            source: { absoluteRef: 'openapi.yaml' } as Source,
            start: { line: 5, col: 1 },
            end: { line: 5, col: 9 },
          } as LocationObject,
        ],
        suggest: [],
      },
    ];

    formatProblems(problems, {
      format: 'junit',
      version: '1.0.0',
      totals: getTotals(problems),
    });

    expect(output).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="UTF-8"?>
      <testsuites name="redocly lint" tests="2" errors="1" failures="1" skipped="0">
      <testsuite name="openapi.yaml" tests="2" errors="1" failures="1">
      <testcase classname="struct" name="struct" file="openapi.yaml" line="1">
      <error message="message" type="struct">Rule: struct
      Severity: error
      File: openapi.yaml
      Line: 1
      Column: 2
      Message: message</error>
      </testcase>
      <testcase classname="other-rule" name="other-rule" file="openapi.yaml" line="5">
      <failure message="a warning" type="other-rule">Rule: other-rule
      Severity: warn
      File: openapi.yaml
      Line: 5
      Column: 1
      Message: a warning</failure>
      </testcase>
      </testsuite>
      </testsuites>
      "
    `);
  });

  it('should emit a valid empty report in junit format when there are no problems', () => {
    formatProblems([], {
      format: 'junit',
      version: '1.0.0',
      totals: getTotals([]),
    });

    expect(output).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="UTF-8"?>
      <testsuites name="redocly lint" tests="0" errors="0" failures="0" skipped="0">
      </testsuites>
      "
    `);
  });
});

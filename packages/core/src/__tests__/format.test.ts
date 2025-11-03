import { outdent } from 'outdent';

import { formatProblems, getTotals } from '../format/format.js';
import { LocationObject, NormalizedProblem } from '../walk.js';
import { Source } from '../resolve.js';

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

  it('should limit suggestions based on MAX_SUGGEST constant', () => {
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
      "::error title=test-rule,file=test.yaml,line=1,col=1,endLine=1,endColumn=10::Test message%0A%0ADid you mean:%0A  - suggestion1%0A  - suggestion2%0A  - suggestion3%0A  - suggestion4%0A  - suggestion5%0A  - suggestion6%0A  - suggestion7%0A%0A
      "
    `);
  });
});

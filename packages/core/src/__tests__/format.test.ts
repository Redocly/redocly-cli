import { outdent } from 'outdent';

import { formatProblems, getTotals } from '../format/format';

describe('format', () => {
  function replaceColors(log: string) {
    return log
      .replace(/\x1b\[33m(.*?)\x1b\[39m/g, '<o>$1</o>') // orange
      .replace(/\x1b\[31m(.*?)\x1b\[39m/g, '<r>$1</r>'); // red
  }

  const problems = [
    {
      ruleId: 'spec',
      location: [],
      severity: 'error' as const,
      message: 'message',
      suggest: [],
    },
    {
      ruleId: 'spec',
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
    jest.spyOn(process.stderr, 'write').mockImplementation((str: string | Uint8Array) => {
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
      "error   spec: 2
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
      "<r>error  </r> spec: 2
      <o>warning</o> other-rule: 1

      "
    `);
  });
});

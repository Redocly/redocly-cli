import * as openapiCore from '@redocly/openapi-core';

import { printScorecardResultsAsJunit } from '../formatters/junit-formatter.js';
import type { ScorecardProblem } from '../types.js';

const createMockSource = (absoluteRef: string) => ({
  absoluteRef,
  getAst: () => ({}),
  getRootAst: () => ({}),
  getLineColLocation: () => ({ line: 1, col: 1 }),
});

describe('printScorecardResultsAsJunit', () => {
  beforeEach(() => {
    vi.spyOn(openapiCore.logger, 'output').mockImplementation(() => {});
    vi.spyOn(openapiCore.logger, 'info').mockImplementation(() => {});
  });

  const getOutput = () =>
    (openapiCore.logger.output as any).mock.calls.map((call: any) => call[0]).join('');

  it('outputs an empty junit suite when there are no problems', () => {
    printScorecardResultsAsJunit('/api/openapi.yaml', [], 'Gold', true);

    expect(getOutput()).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="UTF-8"?>
      <testsuites name="redocly scorecard-classic" tests="0" failures="0" errors="0" skipped="0">
      <testsuite name="scorecard-classic" tests="0" failures="0" errors="0" skipped="0">
      <properties>
      <property name="api" value="/api/openapi.yaml" />
      <property name="achievedLevel" value="Gold" />
      </properties>
      </testsuite>
      </testsuites>

      "
    `);
  });

  it('maps errors to failures and warnings to skipped test cases', () => {
    const problems: ScorecardProblem[] = [
      {
        message: 'Missing summary',
        ruleId: 'operation-summary',
        severity: 'error',
        suggest: [],
        location: [
          {
            source: createMockSource('/api/openapi.yaml') as any,
            pointer: '#/paths/~1pets/get/summary',
            reportOnKey: false,
          },
        ],
        scorecardLevel: 'Gold',
      },
      {
        message: 'Missing description',
        ruleId: 'operation-description',
        severity: 'warn',
        suggest: [],
        location: [
          {
            source: createMockSource('/api/openapi.yaml') as any,
            pointer: '#/info',
            reportOnKey: false,
          },
        ],
        scorecardLevel: 'Silver',
      },
    ];

    printScorecardResultsAsJunit('/api/openapi.yaml', problems, 'Silver', false);

    expect(getOutput()).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="UTF-8"?>
      <testsuites name="redocly scorecard-classic" tests="2" failures="1" errors="0" skipped="1">
      <testsuite name="scorecard-classic" tests="2" failures="1" errors="0" skipped="1">
      <properties>
      <property name="api" value="/api/openapi.yaml" />
      </properties>
      <testcase classname="Gold" name="operation-summary" file="/api/openapi.yaml" line="1">
      <failure message="Missing summary" type="operation-summary">Level: Gold
      Rule: operation-summary
      Severity: error
      File: /api/openapi.yaml
      Line: 1
      Column: 1
      Pointer: #/paths/~1pets/get/summary
      Message: Missing summary</failure>
      </testcase>
      <testcase classname="Silver" name="operation-description" file="/api/openapi.yaml" line="1">
      <skipped message="Missing description">Level: Silver
      Rule: operation-description
      Severity: warn
      File: /api/openapi.yaml
      Line: 1
      Column: 1
      Pointer: #/info
      Message: Missing description</skipped>
      </testcase>
      </testsuite>
      </testsuites>

      "
    `);
  });

  it('XML-escapes details and strips ANSI sequences from messages', () => {
    const problems: ScorecardProblem[] = [
      {
        message: '\u001b[1;31mValue must be < 5 & > 0\u001b[0m',
        ruleId: 'custom/my-rule',
        severity: 'error',
        suggest: [],
        location: [
          {
            source: createMockSource('/api/openapi.yaml') as any,
            pointer: '#/info',
            reportOnKey: false,
          },
        ],
        scorecardLevel: 'Gold',
      },
    ];

    printScorecardResultsAsJunit('/api/openapi.yaml', problems, 'Gold', false);

    expect(getOutput()).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="UTF-8"?>
      <testsuites name="redocly scorecard-classic" tests="1" failures="1" errors="0" skipped="0">
      <testsuite name="scorecard-classic" tests="1" failures="1" errors="0" skipped="0">
      <properties>
      <property name="api" value="/api/openapi.yaml" />
      </properties>
      <testcase classname="Gold" name="custom/my-rule" file="/api/openapi.yaml" line="1">
      <failure message="Value must be &lt; 5 &amp; &gt; 0" type="custom/my-rule">Level: Gold
      Rule: custom/my-rule
      Severity: error
      File: /api/openapi.yaml
      Line: 1
      Column: 1
      Pointer: #/info
      Message: Value must be &lt; 5 &amp; &gt; 0</failure>
      </testcase>
      </testsuite>
      </testsuites>

      "
    `);
  });

  it('falls back to the api path and zero coordinates when a problem has no location', () => {
    const problems: ScorecardProblem[] = [
      {
        message: 'No location error',
        ruleId: 'some-rule',
        severity: 'error',
        suggest: [],
        location: [],
        scorecardLevel: undefined,
      },
    ];

    printScorecardResultsAsJunit('/api/openapi.yaml', problems, 'Non Conformant', false);

    expect(getOutput()).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="UTF-8"?>
      <testsuites name="redocly scorecard-classic" tests="1" failures="1" errors="0" skipped="0">
      <testsuite name="scorecard-classic" tests="1" failures="1" errors="0" skipped="0">
      <properties>
      <property name="api" value="/api/openapi.yaml" />
      </properties>
      <testcase classname="Unknown" name="some-rule" file="/api/openapi.yaml" line="0">
      <failure message="No location error" type="some-rule">Level: Unknown
      Rule: some-rule
      Severity: error
      File: /api/openapi.yaml
      Line: 0
      Column: 0
      Message: No location error</failure>
      </testcase>
      </testsuite>
      </testsuites>

      "
    `);
  });
});

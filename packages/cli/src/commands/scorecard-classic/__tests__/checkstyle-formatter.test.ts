import * as openapiCore from '@redocly/openapi-core';

import { printScorecardResultsAsCheckstyle } from '../formatters/checkstyle-formatter.js';
import type { ScorecardProblem } from '../types.js';

const createMockSource = (absoluteRef: string) => ({
  absoluteRef,
  getAst: () => ({}),
  getRootAst: () => ({}),
  getLineColLocation: () => ({ line: 1, col: 1 }),
});

describe('printScorecardResultsAsCheckstyle', () => {
  beforeEach(() => {
    vi.spyOn(openapiCore.logger, 'output').mockImplementation(() => {});
    vi.spyOn(openapiCore.logger, 'info').mockImplementation(() => {});
  });

  const getOutput = () =>
    (openapiCore.logger.output as any).mock.calls.map((c: any) => c[0]).join('');

  it('outputs empty XML when there are no problems', () => {
    printScorecardResultsAsCheckstyle('/api/openapi.yaml', [], 'Gold', true);

    expect(getOutput()).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="UTF-8"?>
      <checkstyle version="4.3">
      <file name="/api/openapi.yaml">
      </file>
      </checkstyle>

      "
    `);
  });

  it('outputs problems with level-prefixed source and correct severity', () => {
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

    printScorecardResultsAsCheckstyle('/api/openapi.yaml', problems, 'Silver', false);

    expect(getOutput()).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="UTF-8"?>
      <checkstyle version="4.3">
      <file name="/api/openapi.yaml">
      <error line="1" column="1" severity="error" message="Missing summary" source="Gold:operation-summary" />
      <error line="1" column="1" severity="warning" message="Missing description" source="Silver:operation-description" />
      </file>
      </checkstyle>

      "
    `);
  });

  it('XML-escapes special characters in message and source', () => {
    const problems: ScorecardProblem[] = [
      {
        message: 'Value must be < 5 & > 0 with "quotes" and \'apostrophe\'',
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

    printScorecardResultsAsCheckstyle('/api/openapi.yaml', problems, 'Gold', false);

    expect(getOutput()).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="UTF-8"?>
      <checkstyle version="4.3">
      <file name="/api/openapi.yaml">
      <error line="1" column="1" severity="error" message="Value must be &lt; 5 &amp; &gt; 0 with &quot;quotes&quot; and &apos;apostrophe&apos;" source="Gold:custom/my-rule" />
      </file>
      </checkstyle>

      "
    `);
  });

  it('defaults to line 0, column 0 when location is missing', () => {
    const problems: ScorecardProblem[] = [
      {
        message: 'No location error',
        ruleId: 'some-rule',
        severity: 'error',
        suggest: [],
        location: [],
        scorecardLevel: 'Gold',
      },
    ];

    printScorecardResultsAsCheckstyle('/api/openapi.yaml', problems, 'Gold', false);

    expect(getOutput()).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="UTF-8"?>
      <checkstyle version="4.3">
      <file name="/api/openapi.yaml">
      <error line="0" column="0" severity="error" message="No location error" source="Gold:some-rule" />
      </file>
      </checkstyle>

      "
    `);
  });

  it('uses "Unknown" as level prefix when scorecardLevel is undefined', () => {
    const problems: ScorecardProblem[] = [
      {
        message: 'No level error',
        ruleId: 'some-rule',
        severity: 'error',
        suggest: [],
        location: [],
        scorecardLevel: undefined,
      },
    ];

    printScorecardResultsAsCheckstyle('/api/openapi.yaml', problems, 'Non Conformant', false);

    expect(getOutput()).toMatchInlineSnapshot(`
      "<?xml version="1.0" encoding="UTF-8"?>
      <checkstyle version="4.3">
      <file name="/api/openapi.yaml">
      <error line="0" column="0" severity="error" message="No level error" source="Unknown:some-rule" />
      </file>
      </checkstyle>

      "
    `);
  });

  it('logs achieved level to console when target is met', () => {
    printScorecardResultsAsCheckstyle('/api/openapi.yaml', [], 'Gold', true);

    expect(openapiCore.logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Achieved Level:')
    );
    expect(openapiCore.logger.info).toHaveBeenCalledWith(expect.stringContaining('Gold'));
  });

  it('does not log when target level is not achieved', () => {
    printScorecardResultsAsCheckstyle('/api/openapi.yaml', [], 'Non Conformant', false);

    expect(openapiCore.logger.info).not.toHaveBeenCalled();
  });
});

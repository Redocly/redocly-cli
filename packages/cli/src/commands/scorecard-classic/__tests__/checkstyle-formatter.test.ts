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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should output XML header and empty checkstyle element when no problems', () => {
    printScorecardResultsAsCheckstyle('/api/openapi.yaml', [], 'Gold', true);

    const calls = (openapiCore.logger.output as any).mock.calls.map((c: any) => c[0]);
    expect(calls).toContain('<?xml version="1.0" encoding="UTF-8"?>\n');
    expect(calls).toContain('<checkstyle version="4.3">\n');
    expect(calls).toContain('</checkstyle>\n\n');
  });

  it('should output a file element with an error element for a single error problem', () => {
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
    ];

    printScorecardResultsAsCheckstyle('/api/openapi.yaml', problems, 'Gold', true);

    const calls = (openapiCore.logger.output as any).mock.calls.map((c: any) => c[0]);
    expect(calls).toContain('<file name="/api/openapi.yaml [Gold]">\n');
    expect(calls).toContain(
      '<error line="1" column="1" severity="error" message="Missing summary" source="operation-summary" />\n'
    );
    expect(calls).toContain('</file>\n');
  });

  it('should map warn severity to "warning" in the XML', () => {
    const problems: ScorecardProblem[] = [
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

    const calls = (openapiCore.logger.output as any).mock.calls.map((c: any) => c[0]);
    expect(calls).toContain('<file name="/api/openapi.yaml [Silver]">\n');
    expect(calls).toContain(
      '<error line="1" column="1" severity="warning" message="Missing description" source="operation-description" />\n'
    );
  });

  it('should log achieved level to console when target level is achieved', () => {
    printScorecardResultsAsCheckstyle('/api/openapi.yaml', [], 'Gold', true);

    expect(openapiCore.logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Achieved Level:')
    );
    expect(openapiCore.logger.info).toHaveBeenCalledWith(expect.stringContaining('Gold'));
  });

  it('should not log achieved level when target level is not achieved', () => {
    printScorecardResultsAsCheckstyle('/api/openapi.yaml', [], 'Non Conformant', false);

    expect(openapiCore.logger.info).not.toHaveBeenCalled();
  });

  it('should not include achievedLevel in the XML output', () => {
    printScorecardResultsAsCheckstyle('/api/openapi.yaml', [], 'Gold', true);

    const calls = (openapiCore.logger.output as any).mock.calls.map((c: any) => c[0]);
    const checkstyleLine = calls.find((c: string) => c.startsWith('<checkstyle'));
    expect(checkstyleLine).toBe('<checkstyle version="4.3">\n');
  });

  it('should output all problems inside a single file element', () => {
    const problems: ScorecardProblem[] = [
      {
        message: 'First error',
        ruleId: 'rule-a',
        severity: 'error',
        suggest: [],
        location: [
          {
            source: createMockSource('/api/file-a.yaml') as any,
            pointer: '#/paths',
            reportOnKey: false,
          },
        ],
        scorecardLevel: 'Gold',
      },
      {
        message: 'Second error',
        ruleId: 'rule-b',
        severity: 'warn',
        suggest: [],
        location: [
          {
            source: createMockSource('/api/file-a.yaml') as any,
            pointer: '#/components',
            reportOnKey: false,
          },
        ],
        scorecardLevel: 'Silver',
      },
    ];

    printScorecardResultsAsCheckstyle('/api/file-a.yaml', problems, 'Gold', true);

    const calls = (openapiCore.logger.output as any).mock.calls.map((c: any) => c[0]);
    const fileOpens = calls.filter((c: string) => c.startsWith('<file'));
    expect(fileOpens).toHaveLength(2);
    expect(fileOpens).toContain('<file name="/api/file-a.yaml [Gold]">\n');
    expect(fileOpens).toContain('<file name="/api/file-a.yaml [Silver]">\n');

    const errorMessages = calls.filter((c: string) => c.startsWith('<error'));
    expect(errorMessages).toHaveLength(2);
  });

  it('should XML-escape special characters in message and ruleId', () => {
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

    printScorecardResultsAsCheckstyle('/api/openapi.yaml', problems, 'Gold', true);

    const calls = (openapiCore.logger.output as any).mock.calls.map((c: any) => c[0]);
    const errorLine = calls.find((c: string) => c.startsWith('<error'));
    expect(errorLine).toContain('&lt;');
    expect(errorLine).toContain('&amp;');
    expect(errorLine).toContain('&gt;');
    expect(errorLine).toContain('&quot;');
    expect(errorLine).toContain('&apos;');
  });

  it('should output line=0 column=0 for problems without location', () => {
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

    const calls = (openapiCore.logger.output as any).mock.calls.map((c: any) => c[0]);
    const errorLine = calls.find((c: string) => c.startsWith('<error'));
    expect(errorLine).toContain('line="0" column="0"');
  });

  it('should use "Unknown" as level name in file element for problems without scorecardLevel', () => {
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

    const calls = (openapiCore.logger.output as any).mock.calls.map((c: any) => c[0]);
    expect(calls).toContain('<file name="/api/openapi.yaml [Unknown]">\n');
  });

  it('should output valid XML structure with correct order of elements', () => {
    const problems: ScorecardProblem[] = [
      {
        message: 'Test error',
        ruleId: 'test-rule',
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

    printScorecardResultsAsCheckstyle('/api/openapi.yaml', problems, 'Gold', true);

    const calls = (openapiCore.logger.output as any).mock.calls.map((c: any) => c[0]);
    const xmlHeaderIdx = calls.indexOf('<?xml version="1.0" encoding="UTF-8"?>\n');
    const checkstyleOpenIdx = calls.findIndex((c: string) => c.startsWith('<checkstyle'));
    const fileOpenIdx = calls.findIndex((c: string) => c.startsWith('<file'));
    const errorIdx = calls.findIndex((c: string) => c.startsWith('<error'));
    const fileCloseIdx = calls.indexOf('</file>\n');
    const checkstyleCloseIdx = calls.indexOf('</checkstyle>\n\n');

    expect(xmlHeaderIdx).toBeLessThan(checkstyleOpenIdx);
    expect(checkstyleOpenIdx).toBeLessThan(fileOpenIdx);
    expect(fileOpenIdx).toBeLessThan(errorIdx);
    expect(errorIdx).toBeLessThan(fileCloseIdx);
    expect(fileCloseIdx).toBeLessThan(checkstyleCloseIdx);
  });
});

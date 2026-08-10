import { Source } from '@redocly/openapi-core';

import type { DiffResult } from '../engine/types.js';
import { breakingChangesToProblems } from '../serializers/problems.js';

const baseSource = new Source('base.yaml', 'openapi: 3.1.0\n');
const revisionSource = new Source('revision.yaml', 'openapi: 3.1.0\n');

const result: DiffResult = {
  version: '1',
  specVersions: { base: 'oas3_1', revision: 'oas3_1' },
  summary: { breaking: 2, nonBreaking: 1 },
  changes: [
    {
      pointer: '#/paths/~1pets/delete',
      kind: 'removed',
      typeName: 'Operation',
      base: { pointer: '#/paths/~1pets/delete', file: 'base.yaml', line: 21, col: 7 },
      compat: 'breaking',
      verdicts: [
        { compat: 'breaking', ruleId: 'operation-removed', message: 'Operation was removed.' },
      ],
    },
    {
      pointer: '#/paths/~1pets/get/parameters/{query:limit}',
      property: 'required',
      kind: 'changed',
      typeName: 'Parameter',
      base: { pointer: '#/paths/~1pets/get/parameters/0/required' },
      revision: { pointer: '#/paths/~1pets/get/parameters/0/required', value: true },
      compat: 'breaking',
      verdicts: [
        {
          compat: 'breaking',
          ruleId: 'parameter-became-required',
          message: 'Parameter became required.',
        },
      ],
    },
    {
      pointer: '#/info',
      property: 'version',
      kind: 'changed',
      typeName: 'Info',
      base: { pointer: '#/info/version' },
      revision: { pointer: '#/info/version' },
      compat: 'non-breaking',
    },
  ],
};

describe('breakingChangesToProblems', () => {
  it('describes each breaking change the way a lint problem is described', () => {
    const problems = breakingChangesToProblems(result, baseSource, revisionSource);

    // Only the breaking changes map onto a lint problem, because a problem always
    // carries a severity. A removal is shown in the base document, everything else in
    // the revision, with the other side attached as `from` so both are reachable.
    expect(
      problems.map((problem) => ({
        severity: problem.severity,
        ruleId: problem.ruleId,
        message: problem.message,
        at: `${problem.location[0].source.absoluteRef}${problem.location[0].pointer}`,
        from: problem.from && `${problem.from.source.absoluteRef}${problem.from.pointer}`,
      }))
    ).toMatchInlineSnapshot(`
      [
        {
          "at": "base.yaml#/paths/~1pets/delete",
          "from": undefined,
          "message": "Operation was removed.",
          "ruleId": "operation-removed",
          "severity": "error",
        },
        {
          "at": "revision.yaml#/paths/~1pets/get/parameters/0/required",
          "from": "base.yaml#/paths/~1pets/get/parameters/0/required",
          "message": "Parameter became required.",
          "ruleId": "parameter-became-required",
          "severity": "error",
        },
      ]
    `);
  });
});

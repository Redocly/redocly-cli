import { Location } from '../../../ref-utils.js';
import { Source } from '../../../resolve.js';
import type { DiffResult } from '../../types.js';
import { breakingChangesToProblems } from '../problems.js';

const baseSource = new Source('base.yaml', 'openapi: 3.1.0\n');
const revisionSource = new Source('revision.yaml', 'openapi: 3.1.0\n');
const at = (source: Source, pointer: string) => new Location(source, pointer);

const result: DiffResult = {
  version: '1',
  specVersions: { base: 'oas3_1', revision: 'oas3_1' },
  summary: { breaking: 2, nonBreaking: 1 },
  changes: [
    {
      key: '#/paths/~1pets/delete',
      kind: 'removed',
      typeName: 'Operation',
      base: { location: at(baseSource, '#/paths/~1pets/delete'), value: undefined },
      compat: 'breaking',
      verdicts: [
        { compat: 'breaking', ruleId: 'operation-removed', message: 'Operation was removed.' },
      ],
    },
    {
      key: '#/paths/~1pets/get/parameters/{query:limit}',
      property: 'required',
      kind: 'modified',
      typeName: 'Parameter',
      base: {
        location: at(baseSource, '#/paths/~1pets/get/parameters/0/required'),
        value: undefined,
      },
      revision: {
        location: at(revisionSource, '#/paths/~1pets/get/parameters/0/required'),
        value: true,
      },
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
      key: '#/info',
      property: 'version',
      kind: 'modified',
      typeName: 'Info',
      base: { location: at(baseSource, '#/info/version'), value: '1.0.0' },
      revision: { location: at(revisionSource, '#/info/version'), value: '1.0.1' },
      compat: 'non-breaking',
      verdicts: [],
    },
  ],
};

describe('breakingChangesToProblems', () => {
  it('describes each breaking change the way a lint problem is described', () => {
    const problems = breakingChangesToProblems(result);

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

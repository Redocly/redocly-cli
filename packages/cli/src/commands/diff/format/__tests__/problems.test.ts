import { Location, Source, type DiffResult } from '@redocly/openapi-core';

import { diffToProblems } from '../problems.js';
import { lonePair } from './pair.js';

const baseSource = new Source('base.yaml', 'openapi: 3.1.0\n');
const revisionSource = new Source('revision.yaml', 'openapi: 3.1.0\n');
const at = (source: Source, pointer: string) => new Location(source, pointer);

const result: DiffResult = {
  version: '1',
  specVersions: { base: 'oas3_1', revision: 'oas3_1' },
  summary: { major: 1, minor: 1, patch: 1 },
  bump: 'major',
  changes: [
    {
      key: '#/paths/~1pets/get/parameters/{query:limit}',
      property: 'required',
      kind: 'modified',
      pair: lonePair('Parameter', at(baseSource, '#/paths/~1pets/get/parameters/{query:limit}')),
      base: {
        location: at(baseSource, '#/paths/~1pets/get/parameters/0/required'),
        value: undefined,
      },
      revision: {
        location: at(revisionSource, '#/paths/~1pets/get/parameters/0/required'),
        value: true,
      },
      impact: 'major',
      direction: 'request',
      verdicts: [
        {
          ruleId: 'parameter-became-required',
          impact: 'major',
          message: 'Parameter became required.',
          location: at(revisionSource, '#/paths/~1pets/get/parameters/0/required'),
        },
        {
          ruleId: 'parameter-serialization-changed',
          impact: 'major',
          message: 'Parameter serialization changed.',
          location: at(revisionSource, '#/paths/~1pets/get/parameters/0/style'),
        },
      ],
    },
    {
      key: '#/components/schemas/Pet',
      kind: 'added',
      pair: lonePair('Schema', at(baseSource, '#/components/schemas/Pet')),
      revision: {
        location: at(revisionSource, '#/components/schemas/Pet'),
        value: { type: 'object' },
      },
      impact: 'minor',
      direction: 'neutral',
      verdicts: [],
    },
    {
      key: '#/info',
      property: 'version',
      kind: 'modified',
      pair: lonePair('Info', at(baseSource, '#/info')),
      base: { location: at(baseSource, '#/info/version'), value: '1.0.0' },
      revision: { location: at(revisionSource, '#/info/version'), value: '1.0.1' },
      impact: 'patch',
      direction: 'neutral',
      verdicts: [],
    },
  ],
};

describe('diffToProblems', () => {
  it('maps a major impact to error and a minor impact to warn, and drops the patch', () => {
    const problems = diffToProblems(result);

    // Both verdicts on the major change map to their own problem, at the verdict's own
    // location, with the base side attached as `from`. The unjudged minor addition
    // falls back to one problem for the whole change. The patch change carries no
    // severity a lint problem can use, so nothing is reported for it.
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
          "at": "revision.yaml#/paths/~1pets/get/parameters/0/required",
          "from": "base.yaml#/paths/~1pets/get/parameters/0/required",
          "message": "Parameter became required.",
          "ruleId": "parameter-became-required",
          "severity": "error",
        },
        {
          "at": "revision.yaml#/paths/~1pets/get/parameters/0/style",
          "from": "base.yaml#/paths/~1pets/get/parameters/0/required",
          "message": "Parameter serialization changed.",
          "ruleId": "parameter-serialization-changed",
          "severity": "error",
        },
        {
          "at": "revision.yaml#/components/schemas/Pet",
          "from": undefined,
          "message": "added #/components/schemas/Pet",
          "ruleId": "diff",
          "severity": "warn",
        },
      ]
    `);
  });
});

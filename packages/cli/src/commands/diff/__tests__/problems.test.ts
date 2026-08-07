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
  const problems = breakingChangesToProblems(result, baseSource, revisionSource);

  it('keeps only breaking changes', () => {
    expect(problems).toHaveLength(2);
    expect(problems.every((problem) => problem.severity === 'error')).toBe(true);
  });

  it('takes message and ruleId from the worst verdict', () => {
    expect(problems[0]).toMatchObject({
      message: 'Operation was removed.',
      ruleId: 'operation-removed',
    });
  });

  it('points a removal at the base document and a change at the revision', () => {
    expect(problems[0].location[0]).toMatchObject({
      source: baseSource,
      pointer: '#/paths/~1pets/delete',
    });
    expect(problems[1].location[0]).toMatchObject({
      source: revisionSource,
      pointer: '#/paths/~1pets/get/parameters/0/required',
    });
  });

  it('adds the counterpart side as `from` when the change has both sides', () => {
    expect(problems[1].from).toMatchObject({ source: baseSource });
    // A removal is already shown at its base location, so it needs no `from`.
    expect(problems[0].from).toBeUndefined();
  });
});

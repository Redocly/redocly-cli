import { cleanColors } from '../../../utils/miscellaneous.js';
import type { DiffResult } from '../engine/types.js';
import { jsonDiff } from '../serializers/json.js';
import { stylishDiff } from '../serializers/stylish.js';

const RESULT: DiffResult = {
  version: '1',
  specVersions: { base: 'oas3_1', revision: 'oas3_1' },
  summary: { breaking: 3, nonBreaking: 2 },
  changes: [
    {
      pointer: '#/paths/~1pets/get/parameters/{query:limit}',
      property: 'required',
      kind: 'changed',
      typeName: 'Parameter',
      base: {
        pointer: '#/paths/~1pets/get/parameters/0/required',
        file: '/abs/base.yaml',
        line: 9,
        col: 21,
        value: false,
      },
      revision: {
        pointer: '#/paths/~1pets/get/parameters/1/required',
        file: '/abs/rev.yaml',
        line: 11,
        col: 21,
        value: true,
      },
      compat: 'breaking',
      verdicts: [
        {
          ruleId: 'parameter-became-required',
          compat: 'breaking',
          message: 'Parameter became required.',
        },
      ],
    },
    {
      pointer: '#/paths/~1pets/get/requestBody',
      property: 'schema',
      kind: 'changed',
      typeName: 'RequestBody',
      base: {
        pointer: '#/paths/~1pets/get/requestBody/schema',
        file: '/abs/base.yaml',
        line: 14,
        col: 9,
        value: '#/components/schemas/A',
      },
      revision: {
        pointer: '#/paths/~1pets/get/requestBody/schema',
        file: '/abs/rev.yaml',
        line: 14,
        col: 9,
        value: '#/components/schemas/B',
      },
      compat: 'breaking',
      verdicts: [
        { ruleId: 'ref-target-changed', compat: 'breaking', message: 'Reference target changed.' },
      ],
    },
    {
      pointer: '#/paths/~1pets/delete',
      kind: 'removed',
      typeName: 'Operation',
      base: {
        pointer: '#/paths/~1pets/delete',
        file: '/abs/base.yaml',
        line: 30,
        col: 3,
        value: {},
      },
      compat: 'breaking',
      verdicts: [
        { ruleId: 'operation-removed', compat: 'breaking', message: 'Operation was removed.' },
      ],
    },
    {
      pointer: '#/components/schemas/Pet',
      kind: 'added',
      typeName: 'Schema',
      revision: {
        pointer: '#/components/schemas/Pet',
        file: '/abs/rev.yaml',
        line: 20,
        col: 5,
        value: { type: 'object' },
      },
      compat: 'non-breaking',
    },
    {
      pointer: '#/paths/~1pet~1{id}',
      property: 'path',
      kind: 'changed',
      typeName: 'PathItem',
      base: {
        pointer: '#/paths/~1pet~1{id}',
        file: '/abs/base.yaml',
        line: 4,
        col: 3,
        value: '/pet/{id}',
      },
      revision: {
        pointer: '#/paths/~1pet~1{petId}',
        file: '/abs/rev.yaml',
        line: 4,
        col: 3,
        value: '/pet/{petId}',
      },
      compat: 'non-breaking',
    },
  ],
};

describe('stylishDiff', () => {
  it('groups stylish output per operation with locations and all verdicts', () => {
    // vitest.config.ts forces FORCE_COLOR=1, so strip ANSI codes from the real output:
    const output = cleanColors(stylishDiff(RESULT));

    expect(output).toContain('✖ breaking');
    expect(output).toContain('GET /pets');
    expect(output).toContain('DELETE /pets');
    expect(output).toContain('components');
    expect(output).toContain('Parameter became required. (parameter-became-required)');
    expect(output).toMatch(/at .*rev\.yaml:11:21/);
    expect(output).toMatch(/at .*rev\.yaml:20:5/);
    // removed changes point at the base file, others at the revision file:
    expect(output).toMatch(/at .*base\.yaml:30:3/);
    expect(output).toContain('parameters/{query:limit} · required');
    expect(output).toContain('3 breaking, 2 non-breaking.');

    // synthetic path-rename change: grouped under the revision's real path,
    // no method segment, and no leaked JSON-pointer escapes in the label.
    expect(output).toContain('/pet/{petId}');
    expect(output).not.toContain('~1');
    expect(output).not.toContain('~0');
    expect(output).toMatch(/at .*rev\.yaml:4:3/);
  });
});

describe('jsonDiff', () => {
  it('round-trips the DiffResult', () => {
    expect(JSON.parse(jsonDiff(RESULT))).toEqual(JSON.parse(JSON.stringify(RESULT)));
  });
});

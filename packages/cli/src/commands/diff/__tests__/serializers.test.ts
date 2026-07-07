import type { DiffResult } from '../engine/types.js';
import { jsonDiff } from '../serializers/json.js';
import { stylishDiff } from '../serializers/stylish.js';

const RESULT: DiffResult = {
  version: '1',
  specVersions: { base: 'oas3_1', revision: 'oas3_1' },
  summary: { breaking: 1, warning: 1, nonBreaking: 1 },
  changes: [
    {
      pointer: '#/paths/~1pets/get/responses/200',
      property: 'description',
      kind: 'changed',
      typeName: 'Response',
      base: { pointer: '#/paths/~1pets/get/responses/200/description', value: 'OK' },
      revision: { pointer: '#/paths/~1pets/get/responses/200/description', value: 'Pets' },
      compat: 'non-breaking',
    },
    {
      pointer: '#/paths/~1pets/get/parameters/{query:limit}',
      property: 'required',
      kind: 'changed',
      typeName: 'Parameter',
      base: { pointer: '#/paths/~1pets/get/parameters/0/required', value: undefined },
      revision: { pointer: '#/paths/~1pets/get/parameters/0/required', value: true },
      compat: 'breaking',
      ruleIds: ['parameter-became-required'],
      message: 'Parameter became required.',
    },
    {
      pointer: '#/paths/~1pets/get/requestBody/content/application~1json',
      property: 'schema',
      kind: 'changed',
      typeName: 'MediaType',
      base: {
        pointer: '#/paths/~1pets/get/requestBody/content/application~1json/schema',
        value: '#/components/schemas/A',
      },
      revision: {
        pointer: '#/paths/~1pets/get/requestBody/content/application~1json/schema',
        value: '#/components/schemas/B',
      },
      compat: 'warning',
      ruleIds: ['ref-target-changed'],
      message: 'Reference target changed.',
    },
  ],
};

describe('stylishDiff', () => {
  it('orders by severity and renders a summary', () => {
    const output = stylishDiff(RESULT);
    const breakingIndex = output.indexOf('parameter-became-required');
    const warningIndex = output.indexOf('ref-target-changed');
    const nonBreakingIndex = output.indexOf('description');
    expect(breakingIndex).toBeGreaterThan(-1);
    expect(breakingIndex).toBeLessThan(warningIndex);
    expect(warningIndex).toBeLessThan(nonBreakingIndex);
    expect(output).toContain('1 breaking');
    expect(output).toContain('1 warning');
    expect(output).toContain('1 non-breaking');
  });
});

describe('jsonDiff', () => {
  it('round-trips the DiffResult', () => {
    expect(JSON.parse(jsonDiff(RESULT))).toEqual(JSON.parse(JSON.stringify(RESULT)));
  });
});

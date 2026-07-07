import type { DiffResult } from '../engine/types.js';
import { htmlDiff } from '../serializers/html.js';
import { markdownDiff } from '../serializers/markdown.js';

const RESULT: DiffResult = {
  version: '1',
  specVersions: { base: 'oas3_1', revision: 'oas3_1' },
  summary: { breaking: 1, warning: 0, nonBreaking: 0 },
  changes: [
    {
      pointer: '#/paths/~1pets/get',
      kind: 'removed',
      typeName: 'Operation',
      base: { pointer: '#/paths/~1pets/get', value: { summary: '<script>x</script>' } },
      compat: 'breaking',
      ruleIds: ['operation-removed'],
      message: 'Operation was removed.',
    },
  ],
};

describe('markdownDiff', () => {
  it('renders a summary and a table row per change', () => {
    const output = markdownDiff(RESULT);
    expect(output).toContain('| Impact | Change | Location | Details |');
    expect(output).toContain('operation-removed');
    expect(output).toContain('`#/paths/~1pets/get`');
    expect(output).toContain('**1** breaking');
  });
});

describe('htmlDiff', () => {
  it('renders a self-contained page with escaped values', () => {
    const output = htmlDiff(RESULT);
    expect(output).toContain('<style>');
    expect(output).toContain('API diff');
    expect(output).toContain('operation-removed');
    // payload content must be escaped:
    expect(output).not.toContain('<script>x</script>');
    expect(output).toContain('&lt;script&gt;');
    // no external resources (self-contained page):
    expect(output).not.toMatch(/src="http|href="http/);
  });
});

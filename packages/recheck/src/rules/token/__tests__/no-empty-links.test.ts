import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('no-empty-links (MD042)', () => {
  const h = tokenRuleHarness('no-empty-links');

  it('passes a link with a real destination', async () => {
    expect(await h.lint('[a valid link](https://example.com/)\n')).toEqual([]);
  });

  it('flags a link with an empty destination, exact line/column', async () => {
    const problems = await h.lint('[an empty link]()\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
    expect(problems[0].column).toBe(1);
    expect(problems[0].match).toBe('[an empty link]()');
  });

  it('flags a link whose destination is only a hash fragment', async () => {
    const problems = await h.lint('[an empty fragment](#)\n');
    expect(problems).toHaveLength(1);
  });

  it('does not flag a link with a real (non-empty) fragment', async () => {
    expect(await h.lint('[a valid fragment](#fragment)\n')).toEqual([]);
  });

  it('flags a reference-style link whose definition resolves to just "#"', async () => {
    const problems = await h.lint('[an empty link definition][empty]\n\n[empty]: #\n');
    expect(problems).toHaveLength(1);
  });

  it('does not flag a reference-style link whose definition has a real destination', async () => {
    expect(await h.lint('[a valid reference][real]\n\n[real]: https://example.com/\n')).toEqual([]);
  });

  it('flags a shortcut reference link whose definition resolves to just "#"', async () => {
    const problems = await h.lint('[empty]\n\n[empty]: #\n');
    expect(problems).toHaveLength(1);
  });

  it('passes a document with no links', async () => {
    expect(await h.lint('Just a paragraph.\n')).toEqual([]);
  });
});

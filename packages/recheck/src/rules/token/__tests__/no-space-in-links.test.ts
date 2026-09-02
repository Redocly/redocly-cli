import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('no-space-in-links (MD039)', () => {
  const h = tokenRuleHarness('no-space-in-links');

  it('passes a link with no surrounding spaces', async () => {
    expect(await h.lint('[a link](https://www.example.com/)\n')).toEqual([]);
  });

  it('flags a link with leading and trailing spaces, exact line/column', async () => {
    const problems = await h.lint('[ a link ](https://www.example.com/)\n');
    expect(problems).toHaveLength(2);
    expect(problems[0].line).toBe(1);
    expect(problems[0].column).toBe(2);
    expect(problems[1].line).toBe(1);
    expect(problems[1].column).toBe(9);
  });

  it('flags a link with only a leading space', async () => {
    const problems = await h.lint('[ a link](https://www.example.com/)\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].column).toBe(2);
  });

  it('flags a link with only a trailing space', async () => {
    const problems = await h.lint('[a link ](https://www.example.com/)\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].column).toBe(8);
  });

  it('does not flag an image label (only true links)', async () => {
    expect(await h.lint('![ an image ](https://www.example.com/img.png)\n')).toEqual([]);
  });

  it('flags multiple interior spaces (collapsed to single space in context)', async () => {
    const problems = await h.lint('[  multi space  ](https://www.example.com/)\n');
    expect(problems).toHaveLength(2);
    expect(problems[0].match).toBe('[ multi space ]');
  });

  it('produces the exact fixed output removing leading/trailing spaces', async () => {
    const fixed = await h.fix('[ a link ](https://www.example.com/)\n');
    expect(fixed).toBe('[a link](https://www.example.com/)\n');
  });

  it('passes a document with no links', async () => {
    expect(await h.lint('Just a paragraph.\n')).toEqual([]);
  });
});

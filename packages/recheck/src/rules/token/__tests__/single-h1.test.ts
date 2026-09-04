import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('single-h1 (MD025)', () => {
  const h = tokenRuleHarness('single-h1');

  it('passes a single top-level heading', async () => {
    expect(await h.lint('# Title\n\n## Heading\n\n## Another heading\n')).toEqual([]);
  });

  it('flags a second top-level heading when the first is the document title', async () => {
    const problems = await h.lint('# Top level heading\n\n# Another top-level heading\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(3);
  });

  it('does not flag h1s when the first heading is not top-level (preceded by content)', async () => {
    expect(await h.lint('Some intro text.\n\n# H1 one\n\n# H1 two\n')).toEqual([]);
  });

  it('honors a custom level option', async () => {
    const level2 = tokenRuleHarness('single-h1', { level: 2 });
    const problems = await level2.lint('## Top\n\n## Another top\n');
    expect(problems).toHaveLength(1);
  });

  it('treats a frontmatter title as the top-level heading', async () => {
    const problems = await h.lint('---\ntitle: T\n---\n\n# Also top level\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(5);
  });

  it('treats a QUOTED frontmatter title key as the top-level heading (upstream default regex)', async () => {
    const problems = await h.lint('---\n"title": My Doc\n---\n\n# Another H1\n');
    expect(problems).toHaveLength(1);
  });

  it('does not flag two DocFX tab headings (both excluded from top-level heading matching, verified against upstream MD025)', async () => {
    expect(await h.lint('# [A](#tab/a)\n\n# [B](#tab/b)\n')).toEqual([]);
  });

  it('still flags a second top-level heading when frontmatter has no title key (regression)', async () => {
    // Upstream strips YAML frontmatter out of the token stream entirely
    // before scanning (see markdownlint's removeFrontMatter/frontMatterLines
    // handling) -- frontmatter with no recognized title is simply invisible
    // to the "is the first heading actually first" check. Recheck's parser
    // keeps a `yaml` token in the tree instead, so without treating it as
    // non-content here, frontmatter-with-no-title before the first h1 was
    // wrongly read as "content precedes the first heading", making
    // `hasTopLevelHeading` false and silently suppressing a real duplicate
    // top-level-heading violation.
    const problems = await h.lint('---\nproducts:\n  - Redoc\n---\n# H1 one\n\n# H1 two\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(7);
  });
});

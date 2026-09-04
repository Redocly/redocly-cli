import { describe, expect, it } from 'vitest';

import { tokenRuleHarness } from './harness.js';

describe('first-line-h1 (MD041)', () => {
  const h = tokenRuleHarness('first-line-h1');

  it('passes when the first line is a top-level heading', async () => {
    expect(await h.lint('# Document Heading\n\nThis is a document with a heading\n')).toEqual([]);
  });

  it('flags a document that does not start with a top-level heading', async () => {
    const problems = await h.lint('This is a document without a heading\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(1);
  });

  it('accepts an HTML top-level heading', async () => {
    const md =
      '<h1 align="center">Title</h1>\n\nThis is a document with a top-level HTML heading\n';
    expect(await h.lint(md)).toEqual([]);
  });

  it('honors allowPreamble to permit content before the first heading', async () => {
    const withPreamble = tokenRuleHarness('first-line-h1', { allowPreamble: true });
    const md = 'Table of Contents\n\n# Document Heading\n';
    expect(await withPreamble.lint(md)).toEqual([]);
  });

  it('treats a frontmatter title as satisfying the rule', async () => {
    expect(await h.lint('---\ntitle: T\n---\n\nNo heading needed here.\n')).toEqual([]);
  });

  it('skips frontmatter with no title key and still finds the heading right after it', async () => {
    // Regression: upstream markdownlint strips YAML frontmatter out of the
    // token stream entirely before scanning for the first heading (see
    // markdownlint's removeFrontMatter + frontMatterLines offsetting).
    // Recheck's parser keeps a `yaml` token in the tree instead, so this
    // rule must explicitly treat a leading `yaml` token as non-content —
    // without that, frontmatter with no recognized title key (e.g. no
    // `title:` key at all) was wrongly treated as the "first line", which
    // is neither a heading nor an HTML heading tag, so `!allowPreamble`
    // fired a false positive at line 1 even though a valid `# Heading`
    // immediately follows the frontmatter.
    const md = '---\nproducts:\n  - Redoc\n---\n# Access control\n\nBody.\n';
    expect(await h.lint(md)).toEqual([]);
  });

  it('still flags when content after frontmatter (with no title) is not a heading', async () => {
    const md = '---\nproducts:\n  - Redoc\n---\nNot a heading.\n';
    const problems = await h.lint(md);
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(5);
  });

  it('matches upstream per-line frontMatterTitle semantics (no newline bridging)', async () => {
    // Oracle-checked against live markdownlint MD041: with
    // `front_matter_title: "author:.*\\s*title"` this fixture FIRES at line 6
    // ("Some plain text body.") because upstream tests the pattern against
    // each front matter line individually — `\s*` can never absorb the line
    // ending between `author: X` and `title: My Document`.
    const bridged = tokenRuleHarness('first-line-h1', {
      frontMatterTitle: 'author:.*\\s*title',
    });
    const md = '---\nauthor: X\ntitle: My Document\n---\n\nSome plain text body.\n';
    const problems = await bridged.lint(md);
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(6);
  });

  it('honors a custom level option', async () => {
    const level2 = tokenRuleHarness('first-line-h1', { level: 2 });
    expect(await level2.lint('## Heading\n')).toEqual([]);
    const problems = await level2.lint('# Heading\n');
    expect(problems).toHaveLength(1);
  });
});

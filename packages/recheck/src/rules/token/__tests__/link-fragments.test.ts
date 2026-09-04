import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { runRules } from '../../../core/runner.js';
import type { NormalizedRule } from '../../../types/index.js';
import { tokenRuleHarness } from './harness.js';

describe('link-fragments (MD051)', () => {
  const h = tokenRuleHarness('link-fragments');

  it('passes a fragment link matching a heading-derived anchor', async () => {
    expect(await h.lint('# Heading Name\n\n[Link](#heading-name)\n')).toEqual([]);
  });

  it('flags a fragment link with no matching heading, exact line/column', async () => {
    const problems = await h.lint('# Heading Name\n\n[Link](#fragment)\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(3);
    expect(problems[0].column).toBe(1);
    expect(problems[0].match).toBe('[Link](#fragment)');
  });

  it('flags a fragment link matching a heading only by case, exact fixed output', async () => {
    const problems = await h.lint('# Heading Name\n\n[Link](#Heading-Name)\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('Expected: #heading-name; Actual: #Heading-Name');
    const fixed = await h.fix('# Heading Name\n\n[Link](#Heading-Name)\n');
    expect(fixed).toBe('# Heading Name\n\n[Link](#heading-name)\n');
  });

  it('honors ignoreCase: true by not flagging a case-mismatched fragment', async () => {
    const hIgnoreCase = tokenRuleHarness('link-fragments', { ignoreCase: true });
    expect(await hIgnoreCase.lint('# Heading Name\n\n[Link](#Heading-Name)\n')).toEqual([]);
  });

  it('honors ignoredPattern by not flagging a matching fragment', async () => {
    const hIgnored = tokenRuleHarness('link-fragments', { ignoredPattern: '^ignored-' });
    expect(await hIgnored.lint('[Link](#ignored-fragment)\n')).toEqual([]);
  });

  it('passes a custom named anchor via the {#custom-name} syntax', async () => {
    expect(await h.lint('# Heading Name {#custom-name}\n\n[Link](#custom-name)\n')).toEqual([]);
  });

  it('passes a fragment matching an HTML id attribute', async () => {
    expect(await h.lint('<a id="foo"></a>\n\n[Link](#foo)\n')).toEqual([]);
  });

  it('passes a fragment matching an HTML a[name] attribute', async () => {
    expect(await h.lint('<a name="bar"></a>\n\n[Link](#bar)\n')).toEqual([]);
  });

  it('passes a fragment link to an accordion tag in the same file', async () => {
    const md = [
      '# Page',
      '',
      '{% accordion title="Buy a ticket" %}',
      'Use the endpoint.',
      '{% /accordion %}',
      '',
      '[Jump](#buy-a-ticket)',
      '',
    ].join('\n');
    expect(await h.lint(md)).toEqual([]);
  });

  it('always allows the #top fragment', async () => {
    expect(await h.lint('[Link](#top)\n')).toEqual([]);
  });

  it('passes a definition-style fragment link matching a heading', async () => {
    expect(await h.lint('# Heading Name\n\n[Link][ref]\n\n[ref]: #heading-name\n')).toEqual([]);
  });

  it('does not flag a non-fragment (external/relative) link destination', async () => {
    expect(await h.lint('[Link](https://example.com/page)\n')).toEqual([]);
  });

  it('passes a document with no fragment links', async () => {
    expect(await h.lint('Just a paragraph.\n')).toEqual([]);
  });

  it('excludes a DocFX tab heading link from fragment checks but still flags a non-heading link to the same tab', async () => {
    const problems = await h.lint('# [Linux](#tab/linux)\n\n[other](#tab/linux)\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(3);
  });

  it('passes a fragment matching an id attribute on a block-level HTML element (htmlFlow, not htmlText)', async () => {
    expect(await h.lint('<div id="section1"></div>\n\n[link](#section1)\n')).toEqual([]);
  });

  // Ported from the legacy `no-broken-fragment-links` scope rule's tests
  // (src/rules/scope/__tests__/no-broken-fragment-links.test.ts, deleted in
  // Task 11): duplicate-heading fragment numbering and link titles/tooltips
  // weren't yet directly exercised against the token rule.
  it('numbers fragments for duplicate headings (#dup, #dup-1, #dup-2, ...)', async () => {
    const md = [
      '# Intro',
      '',
      '# Intro',
      '',
      '# Intro',
      '',
      '[first](#intro)',
      '[second](#intro-1)',
      '[third](#intro-2)',
      '[missing](#intro-3)',
      '',
    ].join('\n');
    const problems = await h.lint(md);
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(10);
  });

  it('flags a broken fragment even when the link has a title/tooltip', async () => {
    const md = [
      '# Valid Section',
      '',
      '[good](#valid-section "Tooltip")',
      '[bad](#missing-section "This section does not exist")',
      '',
    ].join('\n');
    const problems = await h.lint(md);
    expect(problems).toHaveLength(1);
    expect(problems[0].line).toBe(4);
  });
});

describe('link-fragments crossFile', () => {
  type NR = NormalizedRule;

  function crossFileRule(options: Record<string, unknown> = {}): NR {
    return {
      name: 'recheck/link-fragments',
      shortName: 'link-fragments',
      severity: 'error',
      assertions: { 'link-fragments': { crossFile: true, ...options } },
    };
  }

  function fixture(): string {
    const dir = mkdtempSync(join(tmpdir(), 'recheck-crossfile-'));
    writeFileSync(join(dir, 'target.md'), '# Target Heading\n\nBody text here.\n');
    writeFileSync(join(dir, 'image.png'), 'not-really-a-png');
    return dir;
  }

  async function lint(dir: string, md: string, rule: NR = crossFileRule()) {
    const { problems } = await runRules(
      [{ path: join(dir, 'source.md'), content: md }],
      [rule],
      {}
    );
    return problems;
  }

  it('passes a cross-file link with a valid anchor', async () => {
    const dir = fixture();
    expect(await lint(dir, '[Ok](./target.md#target-heading)\n')).toEqual([]);
  });

  it('flags a cross-file link with a missing anchor', async () => {
    const dir = fixture();
    const problems = await lint(dir, '[Bad](./target.md#no-such-anchor)\n');
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('target.md');
  });

  it('flags a link to a missing file, with or without a fragment', async () => {
    const dir = fixture();
    expect(await lint(dir, '[Gone](./missing.md#x)\n')).toHaveLength(1);
    expect(await lint(dir, '[Gone](./missing.md)\n')).toHaveLength(1);
  });

  it('passes a plain link to an existing file and an existing non-md asset', async () => {
    const dir = fixture();
    expect(await lint(dir, '[Ok](./target.md)\n![Ok](./image.png)\n')).toEqual([]);
  });

  it('flags an image whose target is missing', async () => {
    const dir = fixture();
    expect(await lint(dir, '![Gone](./missing.png)\n')).toHaveLength(1);
  });

  it('skips external, absolute, and mailto destinations', async () => {
    const dir = fixture();
    const md =
      '[A](https://example.com/x#y)\n[B](mailto:x@example.com)\n[C](/site-root/page.md#z)\n[D](//cdn.example.com/x)\n';
    expect(await lint(dir, md)).toEqual([]);
  });

  it('does nothing when crossFile is off (default)', async () => {
    const dir = fixture();
    const rule: NR = {
      name: 'recheck/link-fragments',
      shortName: 'link-fragments',
      severity: 'error',
      assertions: { 'link-fragments': {} },
    };
    expect(await lint(dir, '[Bad](./missing.md#x)\n', rule)).toEqual([]);
  });

  it('honors ignoreCase for cross-file fragments', async () => {
    const dir = fixture();
    expect(
      await lint(dir, '[Ok](./target.md#Target-Heading)\n', crossFileRule({ ignoreCase: true }))
    ).toEqual([]);
    expect(await lint(dir, '[Bad](./target.md#Target-Heading)\n')).toHaveLength(1);
  });

  it('resolves extensionless links the way the Realm router does', async () => {
    const dir = fixture();
    expect(await lint(dir, '[Ok](./target#target-heading)\n[Ok](./target)\n')).toEqual([]);
    expect(await lint(dir, '[Bad](./target#nope)\n')).toHaveLength(1);
    expect(await lint(dir, '[Gone](./missing)\n')).toHaveLength(1);
  });

  it('resolves a directory link through its index.md', async () => {
    const dir = fixture();
    const { mkdirSync, writeFileSync: wf } = await import('node:fs');
    mkdirSync(join(dir, 'section'));
    wf(join(dir, 'section', 'index.md'), '# Section Here\n');
    expect(await lint(dir, '[Ok](./section#section-here)\n[Ok](./section/)\n')).toEqual([]);
  });

  it('falls back to the sibling .md when a bare directory shadows it', async () => {
    const dir = fixture();
    const { mkdirSync } = await import('node:fs');
    mkdirSync(join(dir, 'target'));
    expect(await lint(dir, '[Ok](./target#target-heading)\n')).toEqual([]);
    expect(await lint(dir, '[Bad](./target#no-such-anchor)\n')).toHaveLength(1);
  });

  it('resolves site-root absolute links against rootDir when set', async () => {
    const dir = fixture();
    const rule = crossFileRule({ rootDir: dir });
    const md = '[Ok](/target.md#target-heading)\n[Ok](/target)\n![Ok](/image.png)\n';
    expect(await lint(dir, md, rule)).toEqual([]);
    expect(await lint(dir, '[Bad](/target.md#no-such-anchor)\n', rule)).toHaveLength(1);
    expect(await lint(dir, '[Gone](/missing.md)\n', rule)).toHaveLength(1);
  });

  it('resolves absolute links against rootDir, not the linking file', async () => {
    const dir = fixture();
    const { mkdirSync } = await import('node:fs');
    mkdirSync(join(dir, 'sub'));
    const rule = crossFileRule({ rootDir: dir });
    const { problems } = await runRules(
      [{ path: join(dir, 'sub', 'deep.md'), content: '[Ok](/target.md#target-heading)\n' }],
      [rule],
      {}
    );
    expect(problems).toEqual([]);
  });

  it('still skips absolute links without rootDir, and protocol-relative always', async () => {
    const dir = fixture();
    expect(await lint(dir, '[A](/missing.md)\n')).toEqual([]);
    const rule = crossFileRule({ rootDir: dir });
    expect(await lint(dir, '[B](//cdn.example.com/x)\n', rule)).toEqual([]);
  });

  it('rootDir as a map picks the root by the linking file directory', async () => {
    const { mkdirSync, writeFileSync: wf } = await import('node:fs');
    const dir = mkdtempSync(join(tmpdir(), 'recheck-multiroot-'));
    mkdirSync(join(dir, 'website', 'docs'), { recursive: true });
    mkdirSync(join(dir, 'team-docs'), { recursive: true });
    wf(join(dir, 'website', 'home.md'), '# Website Home\n');
    wf(join(dir, 'team-docs', 'sop.md'), '# Team SOP\n');
    const rule = crossFileRule({
      rootDir: {
        [join(dir, 'website')]: join(dir, 'website'),
        [join(dir, 'team-docs')]: join(dir, 'team-docs'),
      },
    });
    const lintAt = async (path: string, md: string) =>
      (await runRules([{ path, content: md }], [rule], {})).problems;

    expect(
      await lintAt(join(dir, 'website', 'docs', 'a.md'), '[Ok](/home.md#website-home)\n')
    ).toEqual([]);
    expect(await lintAt(join(dir, 'website', 'docs', 'a.md'), '[Bad](/sop.md)\n')).toHaveLength(1);
    expect(await lintAt(join(dir, 'team-docs', 'b.md'), '[Ok](/sop.md#team-sop)\n')).toEqual([]);
    expect(await lintAt(join(dir, 'team-docs', 'b.md'), '[Bad](/home.md)\n')).toHaveLength(1);
    expect(await lintAt(join(dir, 'elsewhere.md'), '[Skipped](/home.md)\n')).toEqual([]);
  });

  it('rootDir map uses the longest matching prefix', async () => {
    const { mkdirSync, writeFileSync: wf } = await import('node:fs');
    const dir = mkdtempSync(join(tmpdir(), 'recheck-nestedroot-'));
    mkdirSync(join(dir, 'site', 'sub', 'root'), { recursive: true });
    wf(join(dir, 'site', 'outer.md'), '# Outer\n');
    wf(join(dir, 'site', 'sub', 'root', 'inner.md'), '# Inner\n');
    const rule = crossFileRule({
      rootDir: {
        [join(dir, 'site')]: join(dir, 'site'),
        [join(dir, 'site', 'sub')]: join(dir, 'site', 'sub', 'root'),
      },
    });
    const { problems } = await runRules(
      [{ path: join(dir, 'site', 'sub', 'page.md'), content: '[Ok](/inner.md#inner)\n' }],
      [rule],
      {}
    );
    expect(problems).toEqual([]);
  });

  it('markdoc tags in headings do not change the slug', async () => {
    const md = '## Payments {% badge text="new" /%}\n\n[Ok](#payments)\n';
    const markdocRule: NormalizedRule = {
      name: 'recheck/link-fragments',
      shortName: 'link-fragments',
      severity: 'error',
      assertions: { 'link-fragments': {} },
    };
    const withMarkdoc = await runRules([{ path: 't.md', content: md }], [markdocRule], {
      markdoc: true,
    });
    expect(withMarkdoc.problems).toEqual([]);
    const withoutMarkdoc = await runRules([{ path: 't.md', content: md }], [markdocRule], {});
    expect(withoutMarkdoc.problems).toEqual([]);
  });

  it('ignoredTargets skips generated routes by destination glob', async () => {
    const dir = fixture();
    const rule = crossFileRule({
      rootDir: dir,
      ignoredTargets: ['/gateways/**', '/catalog/**'],
    });
    const md = '[A](/gateways/stripe#setup)\n[B](/catalog/entities)\n[C](/missing.md)\n';
    const problems = await lint(dir, md, rule);
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('missing.md');
  });

  it('ignoredTargets matches relative destinations through leading dot segments', async () => {
    const dir = fixture();
    const rule = crossFileRule({ ignoredTargets: ['**/generated-api/**'] });
    const md = '[A](../../generated-api/entities)\n[B](./generated-api/things#x)\n';
    expect(await lint(dir, md, rule)).toEqual([]);
  });

  it('details/summary anchors resolve the way the theme generates them', async () => {
    const dir = fixture();
    const { writeFileSync: wf } = await import('node:fs');
    wf(
      join(dir, 'details.md'),
      [
        '# Page',
        '',
        '<details>',
        '<summary>Grant limited access</summary>',
        'Body one.',
        '</details>',
        '',
        '<details id="custom-anchor">',
        '<summary>Custom</summary>',
        'Body two.',
        '</details>',
        '',
        '<details>',
        '<summary>Grant limited access</summary>',
        'Duplicate summary.',
        '</details>',
        '',
      ].join('\n')
    );
    const md = [
      '[A](./details.md#grant-limited-access)',
      '[B](./details.md#custom-anchor)',
      '[C](./details.md#grant-limited-access-2)',
      '[D](./details.md#no-such-details)',
      '',
    ].join('\n');
    const problems = await lint(dir, md);
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('no-such-details');
  });

  it('details ids encode, keep theme whitespace padding, and respect bounds', async () => {
    const dir = fixture();
    const { writeFileSync: wf } = await import('node:fs');
    wf(
      join(dir, 'edge.md'),
      [
        '# Page',
        '',
        '<details>',
        '<summary>FAQs & more</summary>',
        'Ampersand id.',
        '</details>',
        '',
        '<details>',
        '<summary>',
        'Padded summary',
        '</summary>',
        'Multiline summary keeps browser padding hyphens.',
        '</details>',
        '',
        '<details>',
        'No summary at all.',
        '</details>',
        '',
        '<details>',
        '<summary>Real one</summary>',
        'Must not be stolen by the block above.',
        '</details>',
        '',
      ].join('\n')
    );
    const md = [
      '[A](./edge.md#faqs-&-more)',
      '[B](./edge.md#-padded-summary-)',
      '[C](./edge.md#details-2)',
      '[D](./edge.md#real-one)',
      '',
    ].join('\n');
    expect(await lint(dir, md)).toEqual([]);
  });

  it('details inside code fences produce no anchors', async () => {
    const dir = fixture();
    const { writeFileSync: wf } = await import('node:fs');
    wf(
      join(dir, 'fenced.md'),
      [
        '# Page',
        '',
        '```html',
        '<details>',
        '<summary>Example only</summary>',
        '</details>',
        '```',
        '',
        '<details>',
        '<summary>Live block</summary>',
        'Body.',
        '</details>',
        '',
      ].join('\n')
    );
    expect(await lint(dir, '[Ok](./fenced.md#live-block)\n')).toEqual([]);
    expect(await lint(dir, '[Bad](./fenced.md#example-only)\n')).toHaveLength(1);
  });

  it('accordion tag anchors resolve the way the theme generates them', async () => {
    const dir = fixture();
    const { writeFileSync: wf } = await import('node:fs');
    wf(
      join(dir, 'accordions.md'),
      [
        '# Page',
        '',
        '{% accordion title="How do I buy a ticket?" %}',
        'Use the endpoint.',
        '{% /accordion %}',
        '',
        '{% accordion-group %}',
        '  {% accordion title="Refunds" %}',
        '  Up to 24 hours before the visit.',
        '  {% /accordion %}',
        '  {% accordion title="Refunds" %}',
        '  Duplicate title takes the index suffix.',
        '  {% /accordion %}',
        '{% /accordion-group %}',
        '',
      ].join('\n')
    );
    const md = [
      '[A](./accordions.md#how-do-i-buy-a-ticket?)',
      '[B](./accordions.md#refunds)',
      '[C](./accordions.md#refunds-2)',
      '[D](./accordions.md#no-such-accordion)',
      '',
    ].join('\n');
    const problems = await lint(dir, md);
    expect(problems).toHaveLength(1);
    expect(problems[0].message).toContain('no-such-accordion');
  });

  it('accordions and raw details share the theme runtime id space', async () => {
    const dir = fixture();
    const { writeFileSync: wf } = await import('node:fs');
    wf(
      join(dir, 'mixed.md'),
      [
        '# Page',
        '',
        '<details>',
        '<summary>Setup</summary>',
        'Raw details first.',
        '</details>',
        '',
        '{% accordion title="Setup" %}',
        'Same title as the details above.',
        '{% /accordion %}',
        '',
        '<details>',
        'No summary: the fallback index counts the accordion.',
        '</details>',
        '',
      ].join('\n')
    );
    const md = [
      '[A](./mixed.md#setup)',
      '[B](./mixed.md#setup-1)',
      '[C](./mixed.md#details-2)',
      '',
    ].join('\n');
    expect(await lint(dir, md)).toEqual([]);
  });

  it('accordion edges: self-closing, multi-line, escapes, empty and dynamic titles, fences', async () => {
    const dir = fixture();
    const { writeFileSync: wf } = await import('node:fs');
    wf(
      join(dir, 'edge2.md'),
      [
        '# Page',
        '',
        '{% accordion title="Empty body" /%}',
        '',
        '{% accordion',
        '   title="Split over lines" %}',
        'Body.',
        '{% /accordion %}',
        '',
        '{% accordion title="Say \\"hi\\" now" %}',
        'Body.',
        '{% /accordion %}',
        '',
        '{% accordion title=$dynamicTitle %}',
        'Unknowable at lint time: no anchor, but it still takes an index.',
        '{% /accordion %}',
        '',
        '{% accordion title="" %}',
        'Falls back to the positional id.',
        '{% /accordion %}',
        '',
        '```md',
        '{% accordion title="Example only" %}',
        '{% /accordion %}',
        '```',
        '',
      ].join('\n')
    );
    const md = [
      '[A](./edge2.md#empty-body)',
      '[B](./edge2.md#split-over-lines)',
      '[C](./edge2.md#say-"hi"-now)',
      '[D](./edge2.md#details-4)',
      '[E](./edge2.md#details-3)',
      '[F](./edge2.md#example-only)',
      '',
    ].join('\n');
    const problems = await lint(dir, md);
    expect(problems).toHaveLength(2);
    expect(problems[0].message).toContain('details-3');
    expect(problems[1].message).toContain('example-only');
  });

  it('details inside HTML comments in a target produce no anchors', async () => {
    const dir = fixture();
    const { writeFileSync: wf } = await import('node:fs');
    wf(
      join(dir, 'commented.md'),
      '# Page\n\n<!--\n<details>\n<summary>Hidden</summary>\n</details>\n-->\n\nBody.\n'
    );
    expect(await lint(dir, '[Bad](./commented.md#hidden)\n')).toHaveLength(1);
  });

  it('in-file links to details anchors pass', async () => {
    const md =
      '# Page\n\n<details>\n<summary>Grant limited access</summary>\nBody.\n</details>\n\n[Ok](#grant-limited-access)\n';
    const rule: NormalizedRule = {
      name: 'recheck/link-fragments',
      shortName: 'link-fragments',
      severity: 'error',
      assertions: { 'link-fragments': {} },
    };
    const { problems } = await runRules([{ path: 't.md', content: md }], [rule], {});
    expect(problems).toEqual([]);
  });

  it('still validates in-file fragments in the same run', async () => {
    const dir = fixture();
    const problems = await lint(dir, '# Here\n\n[Bad](#nope)\n[Ok](#here)\n');
    expect(problems).toHaveLength(1);
  });
});

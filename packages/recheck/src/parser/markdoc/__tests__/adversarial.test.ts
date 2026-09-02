import { describe, it, expect } from 'vitest';

import { parseMarkdown } from '../../index.js';

// Absolute-ceiling companions to the ratio-based linearity tests in
// tokenize.test.ts, which catch a quadratic regression that only shows up at
// real scale rather than in a doubling ratio. The property under test is
// non-explosion -- finishing at all, comfortably -- not exact speed, so the
// ceiling is enormous headroom for content this size.
const ABSOLUTE_CEILING_MS = 2000;

// Wall-clock assertions measure the machine as much as the code. The PR
// pipeline runs 12 test processes on 8 cores, where these ceilings fail on
// runner load alone. They run on every local `pnpm test` and, uncontended,
// in the nightly recheck-perf workflow (RECHECK_PERF=1).
const SKIP_TIMING_IN_CI = Boolean(process.env.CI) && !process.env.RECHECK_PERF;

describe.skipIf(SKIP_TIMING_IN_CI)('adversarial performance: absolute ceilings', () => {
  it('5,000 unterminated `{%` openers stay well under the ceiling', () => {
    // There is no `%}` anywhere in the document. The `%}` index in syntax.ts
    // is what keeps this from re-scanning from every `{%` to end of document.
    const source = `${Array.from(
      { length: 5000 },
      (_, i) => `{% opener-${i} still not closed`
    ).join('\n')}\n`;
    const started = performance.now();
    const tree = parseMarkdown(source, { markdoc: true });
    const elapsed = performance.now() - started;
    expect(tree.flat.some((t) => t.type === 'markdocTag')).toBe(false);
    expect(elapsed).toBeLessThan(ABSOLUTE_CEILING_MS);
  });

  it('5,000 adjacent tags on one line stay well under the ceiling', () => {
    const source = `${'{% t %}'.repeat(5000)}\n`;
    const started = performance.now();
    const tree = parseMarkdown(source, { markdoc: true });
    const elapsed = performance.now() - started;
    expect(tree.flat.filter((t) => t.type === 'markdocTag')).toHaveLength(5000);
    expect(elapsed).toBeLessThan(ABSOLUTE_CEILING_MS);
  });

  it('a 100KB single-line span candidate stays well under the ceiling', () => {
    // One enormous candidate rather than many small ones, which stresses the
    // span scanner's quoted-string walk instead of its re-entry.
    const hugeValue = 'x'.repeat(100_000);
    const source = `{% a value="${hugeValue}" %}\n`;
    const started = performance.now();
    const tree = parseMarkdown(source, { markdoc: true });
    const elapsed = performance.now() - started;
    const tag = tree.flat.find((t) => t.type === 'markdocTag');
    expect(tag?.markdocKind).toBe('tag-open');
    expect(tag?.text).toBe(source.trimEnd());
    expect(elapsed).toBeLessThan(ABSOLUTE_CEILING_MS);
  });

  it('a 100KB single-line candidate that NEVER closes also stays well under the ceiling', () => {
    // The reject path over a huge span: the repeated `%` characters keep
    // re-entering the tokenizer's maybe-close state but never reach a `%}`.
    const source = `{% ${'%'.repeat(100_000)}\n`;
    const started = performance.now();
    const tree = parseMarkdown(source, { markdoc: true });
    const elapsed = performance.now() - started;
    expect(tree.flat.some((t) => t.type === 'markdocTag')).toBe(false);
    expect(elapsed).toBeLessThan(ABSOLUTE_CEILING_MS);
  });

  // Nothing here drives iteration off a regex match, so a zero-width
  // `re.exec` loop -- the usual way a scanner stalls -- cannot occur: the
  // tokenizer consumes exactly one code point per state transition and the
  // span parser's loops all advance an explicit integer cursor. This can't
  // prove that negative; it shows the input shape most likely to expose a
  // stalled scan, thousands of minimal tags with no separating content,
  // stays fast.
  it('thousands of minimal empty-bodied tags never stall (zero-width-loop impossibility by construction)', () => {
    const source = `${'{%%}'.repeat(5000)}\n`;
    const started = performance.now();
    const tree = parseMarkdown(source, { markdoc: true });
    const elapsed = performance.now() - started;
    expect(tree.flat.filter((t) => t.type === 'markdocTag')).toHaveLength(5000);
    expect(elapsed).toBeLessThan(ABSOLUTE_CEILING_MS);
  });
});

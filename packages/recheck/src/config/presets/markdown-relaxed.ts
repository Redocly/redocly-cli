import type { BaseRule, RecheckRules } from '../../types/index.js';
import { buildMarkdownPreset } from './markdown.js';

/**
 * `recheck/markdown-relaxed` mirrors markdownlint's `style/relaxed.json`:
 * the same rule set as the base style, with a handful of rules turned off
 * (see upstream comment "Relaxed rules"). Source:
 * /Users/adam/Downloads/markdownlint-main/style/relaxed.json:
 *
 *   { "default": true, "whitespace": false, "line_length": false,
 *     "ul-indent": false, "no-inline-html": false, "no-bare-urls": false,
 *     "fenced-code-language": false, "first-line-h1": false }
 *
 * Upstream rule names (snake/kebab as markdownlint spells them) map to
 * Recheck's ported rule names (camelCase-free, kebab, matching our
 * `recheck/<name>` assertion ids). This preset is COMPUTED rather than a
 * static object literal: it takes whatever `recheck/markdown` currently
 * contains and layers a static override map on top. That way, batch tasks
 * only ever need to (a) register the rule in markdown.ts and (b) add one
 * line here mapping its upstream relaxed-name to a severity/option
 * override — this file never has to enumerate assertion ids that don't
 * exist yet, and overrides for rules not yet in the base preset are
 * simply dropped (inert) rather than producing an unresolvable assertion
 * id at validate time.
 *
 * Keys here are Recheck's ported rule short names (not upstream's), since
 * that's what will exist in `recheck/markdown`'s keys once each rule
 * lands; the upstream name is noted in each entry's comment.
 */
const RELAXED_OVERRIDES: Record<string, Partial<BaseRule>> = {
  // upstream "whitespace": false. `whitespace` is a markdownlint TAG (not a
  // rule id) — it disables every rule carrying that tag. Per each rule's
  // own `tags` array upstream: MD009 (no-trailing-spaces), MD010
  // (no-hard-tabs), and MD012 (no-multiple-blanks) all carry `whitespace`.
  // All three landed in Task 6 as token rules with their own
  // `defaults.message`, so all three get an override now.
  'no-trailing-spaces': { severity: 'off' },
  'no-hard-tabs': { severity: 'off' },
  'no-multiple-blanks': { severity: 'off' },
  // upstream "whitespace": false (same tag as above). MD027
  // (no-multiple-space-blockquote) and MD028 (no-blanks-blockquote) also
  // carry the `whitespace` tag upstream (alongside `blockquote`/
  // `indentation`), and both land in Task 10/batch 6, so they join the
  // same tag-driven override group.
  'no-multiple-space-blockquote': { severity: 'off' },
  'no-blanks-blockquote': { severity: 'off' },
  // upstream "line_length": false. This is the *ported* line-length rule
  // (MD013's Recheck id is `line-length`, landed in Task 6).
  'line-length': { severity: 'off' },
  // upstream "ul-indent": false. Declared since Task 4 (inert until the
  // rule itself was registered in markdown.ts); the batch-3 list rules
  // (Task 7) register `ul-indent` (MD007), so this override now activates
  // as a real top-level key. None of the other five batch-3 rules
  // (ul-style/list-indent/ol-prefix/list-marker-space/blanks-around-lists)
  // appear in relaxed.json at all, so they get no override here and stay
  // at the base preset's `error` severity in markdown-relaxed too.
  'ul-indent': { severity: 'off' },
  // upstream "no-inline-html": false. Declared since Task 4 (inert until
  // the rule itself was registered in markdown.ts); batch 5 (Task 9)
  // registers `no-inline-html` (MD033), so this override now activates as
  // a real top-level key.
  'no-inline-html': { severity: 'off' },
  // upstream "no-bare-urls": false. Declared since Task 4 (inert until the
  // rule itself was registered in markdown.ts); batch 5 (Task 9) registers
  // `no-bare-urls` (MD034), so this override now activates as a real
  // top-level key. None of the other nine batch-5 rules (proper-names/
  // no-alt-text/emphasis-style/strong-style/link-fragments/
  // reference-links-images/link-image-reference-definitions/
  // link-image-style/descriptive-link-text) appear in relaxed.json at all,
  // so they get no override here and stay at the base preset's `error`
  // severity in markdown-relaxed too.
  'no-bare-urls': { severity: 'off' },
  // upstream "fenced-code-language": false. Declared since Task 4 (inert
  // until the rule itself was registered in markdown.ts); batch 4 (Task 8)
  // registers `fenced-code-language` (MD040), so this override now
  // activates as a real top-level key. None of the other nine batch-4
  // rules (no-reversed-links/commands-show-output/blanks-around-fences/
  // no-space-in-emphasis/no-space-in-code/no-space-in-links/no-empty-links/
  // code-block-style/code-fence-style) appear in relaxed.json at all, so
  // they get no override here and stay at the base preset's `error`
  // severity in markdown-relaxed too.
  'fenced-code-language': { severity: 'off' },
  // upstream "first-line-h1": false
  'first-line-h1': { severity: 'off' },
};

export function buildMarkdownRelaxedPreset(): RecheckRules {
  const base = buildMarkdownPreset();
  const result: RecheckRules = { ...base };

  for (const [shortName, override] of Object.entries(RELAXED_OVERRIDES)) {
    const key = `recheck/${shortName}`;
    const existing = result[key];
    // Inert until the base rule is registered in the markdown preset —
    // never introduces a key/assertion id that doesn't exist yet.
    if (!existing) continue;
    result[key] = { ...existing, ...override };
  }

  return result;
}

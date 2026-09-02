import type { BaseRule, RecheckConfig } from '../../types/index.js';

/**
 * `recheck/markdoc` — the four Recheck-original Markdoc rules bundled into one
 * `extends`-able preset. Unlike `recheck/markdown`/`recheck/prose` they have
 * no markdownlint counterpart and no schema-derived word list; they validate
 * Markdoc TAG syntax itself (`{% tag attr="value" %}`), so they are
 * unreachable unless the caller also turns on `markdoc: true` (or its object
 * form) in the SAME config — config/validate.ts warns about that mistake.
 *
 * `markdoc-attributes` is genuinely MIXED: configured `error` here for the
 * structural cases (missing required, enum, wrong type, duplicate), while the
 * rule itself downgrades its "unknown attribute" reports to `warn` via a
 * per-report severity override that wins over this rule-level value. Same
 * reasoning behind `markdoc-unknown-tag` being `warn` outright — a typo in a
 * NAME is less certain than a violation of a tag's own declared shape.
 *
 * Every rule is `fix: false`. That matches each `TokenRule`'s own `fixable:
 * false`, but is set explicitly here because the "no rule in %s is fixable"
 * test guard reads the CONFIG's `fix` field, not the rule's capability.
 *
 * `message` mirrors each rule's own `defaults.message`: `'%s'` everywhere
 * except `markdoc-syntax`, because every `onError` call already supplies the
 * complete sentence via `context` or `detail`. Independent wording here would
 * only drift from the strings each rule's tests pin with `toBe`.
 */
const MARKDOC_SYNTAX: BaseRule = {
  severity: 'error',
  message: 'Markdoc syntax error',
  fix: false,
  assertions: { 'markdoc-syntax': {} },
};

const MARKDOC_PAIRING: BaseRule = {
  severity: 'error',
  message: '%s',
  fix: false,
  assertions: { 'markdoc-pairing': {} },
};

const MARKDOC_UNKNOWN_TAG: BaseRule = {
  severity: 'warn',
  message: '%s',
  fix: false,
  assertions: { 'markdoc-unknown-tag': {} },
};

const MARKDOC_ATTRIBUTES: BaseRule = {
  severity: 'error',
  message: '%s',
  fix: false,
  assertions: { 'markdoc-attributes': {} },
};

export function buildMarkdocPreset(): RecheckConfig {
  return {
    'recheck/markdoc-syntax': MARKDOC_SYNTAX,
    'recheck/markdoc-pairing': MARKDOC_PAIRING,
    'recheck/markdoc-unknown-tag': MARKDOC_UNKNOWN_TAG,
    'recheck/markdoc-attributes': MARKDOC_ATTRIBUTES,
  };
}

/** The preset's rule keys, so tests can assert "exactly these four". */
export const MARKDOC_PRESET_RULE_NAMES = [
  'recheck/markdoc-syntax',
  'recheck/markdoc-pairing',
  'recheck/markdoc-unknown-tag',
  'recheck/markdoc-attributes',
] as const;

/**
 * One entry per distinct `ctx.onError`/`reports.push` call site across the four
 * rule files — a per-VIOLATION coverage gate rather than a per-rule one, since
 * a per-rule gate leaves individual message variants untested. So this list
 * separates a bareword PRIMARY value (grammar-level) from a bareword named
 * attribute, and names a close tag carrying attributes, a self-closing tag
 * paired with an explicit close, a positional primary on a tag that declares no
 * `primary` attribute, and the duplicate-attribute walk.
 *
 * Two tests in config/__tests__/preset-markdoc.test.ts enforce this list
 * together: one fails if a class listed here never fires on the shared
 * fixture, the other counts real report call sites in the four rule files and
 * asserts the total equals this list's length — so a new report site with no
 * entry here fails immediately instead of shipping untested.
 */
export const MARKDOC_VIOLATION_CLASSES = [
  // markdoc-syntax.ts
  'malformed',
  'close-tag-attributes',
  'primary-bareword',
  'attribute-bareword',
  // markdoc-pairing.ts
  'unclosed',
  'orphaned',
  'crossed',
  'void-missing-slash',
  'self-closing-with-close',
  // markdoc-unknown-tag.ts
  'unknown-tag',
  // markdoc-attributes.ts
  'primary-unknown-attribute',
  'wrong-type',
  'enum',
  'unknown-attr',
  'missing-required',
  'duplicate-attribute',
] as const;

import type { BaseRule, RecheckRules } from '../../types/index.js';

/**
 * `recheck/markdoc`: rules that check Markdoc tag syntax, such as
 * `{% tag attr="value" %}`. They only run when `markdoc` is also enabled in
 * the same config.
 *
 * `markdoc-attributes` is `error`, but the rule reports unknown attributes as
 * `warn`, the same as `markdoc-unknown-tag`: a mistyped name is less certain
 * than a tag used against its own declared shape.
 *
 * `fix` is `false` explicitly because the "no rule is fixable" check reads the
 * config, not the rule. Messages come from each rule's own report text.
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

export function buildMarkdocPreset(): RecheckRules {
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
 * One entry per kind of violation the four rule files report. Tests check that
 * each kind fires on the shared fixture and that no report site is missing.
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

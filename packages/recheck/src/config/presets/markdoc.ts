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

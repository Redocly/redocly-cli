import type { BaseRule, RecheckRules } from '../../types/index.js';

/**
 * Builds one `recheck/<name>` entry for each rule name, with
 * `severity: 'error'` and empty assertion options.
 *
 * An entry has a `message` only when `messages` names one. `validate` gives a
 * token rule the message from its `defaults`. A scope rule has no `defaults`,
 * so it needs an explicit message here.
 */
export function registerPresetRules(
  names: string[],
  messages: Record<string, string> = {}
): RecheckRules {
  const config: RecheckRules = {};
  for (const name of names) {
    const rule: BaseRule = { severity: 'error', assertions: { [name]: {} } };
    if (messages[name]) rule.message = messages[name];
    config[`recheck/${name}`] = rule;
  }
  return config;
}

/**
 * Rule (short) names in the `recheck/markdown` preset. `validate` gives each
 * token rule the message from its own `defaults.message`. List a name in
 * MARKDOWN_PRESET_MESSAGES only for a scope rule or to change the wording.
 */
export const MARKDOWN_PRESET_RULES: string[] = [
  'heading-increment',
  'heading-style',
  'no-missing-space-atx',
  'no-multiple-space-atx',
  'no-missing-space-closed-atx',
  'no-multiple-space-closed-atx',
  'blanks-around-headings',
  'heading-start-left',
  'no-duplicate-heading',
  'single-h1',
  'no-trailing-punctuation',
  'no-emphasis-as-heading',
  'first-line-h1',
  'required-headings',
  'no-trailing-spaces',
  'no-hard-tabs',
  'no-multiple-blanks',
  'line-length',
  'single-trailing-newline',
  'hr-style',
  'ul-style',
  'list-indent',
  'ul-indent',
  'ol-prefix',
  'list-marker-space',
  'blanks-around-lists',
  'no-reversed-links',
  'commands-show-output',
  'blanks-around-fences',
  'no-space-in-emphasis',
  'no-space-in-code',
  'no-space-in-links',
  'fenced-code-language',
  'no-empty-links',
  'code-block-style',
  'code-fence-style',
  'no-inline-html',
  'no-bare-urls',
  'proper-names',
  'no-alt-text',
  'emphasis-style',
  'strong-style',
  'link-fragments',
  'reference-links-images',
  'link-image-reference-definitions',
  'link-image-style',
  'descriptive-link-text',
  'no-multiple-space-blockquote',
  'no-blanks-blockquote',
  'table-pipe-style',
  'table-column-count',
  'blanks-around-tables',
  'table-column-style',
];

/**
 * Explicit messages for markdown preset rules, keyed by short rule name.
 * Empty today: every rule in MARKDOWN_PRESET_RULES is a token rule.
 */
export const MARKDOWN_PRESET_MESSAGES: Record<string, string> = {};

export function buildMarkdownPreset(): RecheckRules {
  return registerPresetRules(MARKDOWN_PRESET_RULES, MARKDOWN_PRESET_MESSAGES);
}

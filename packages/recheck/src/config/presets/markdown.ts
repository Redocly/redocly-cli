import type { BaseRule, RecheckRules } from '../../types/index.js';

/**
 * Builds one `recheck/<name>` entry for each token rule name, with
 * `severity: 'error'` and empty assertion options. `validate` gives each entry
 * the message from the token rule's own `defaults`.
 */
export function registerPresetRules(names: string[]): RecheckRules {
  const config: RecheckRules = {};
  for (const name of names) {
    const rule: BaseRule = { severity: 'error', assertions: { [name]: {} } };
    config[`recheck/${name}`] = rule;
  }
  return config;
}

/** Rule (short) names in the `recheck/markdown` preset. */
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

export function buildMarkdownPreset(): RecheckRules {
  return registerPresetRules(MARKDOWN_PRESET_RULES);
}

import type { RecheckConfig } from '../../types/index.js';
import { buildMarkdownPreset } from './markdown.js';

// Keep in sync with EMBEDDED_UNSUPPORTED_RULES in core/runner.ts.
const UNSUPPORTED = [
  'recheck/single-h1',
  'recheck/first-line-h1',
  'recheck/front-matter',
  'recheck/single-trailing-newline',
  'recheck/link-fragments',
];

// Excluded by corpus measurement (#26424).
const MEASURED_OUT = ['recheck/line-length', 'recheck/ul-indent'];

/**
 * `recheck/api-descriptions` — the markdown rules that apply to embedded
 * markdown, such as an OpenAPI `description` field. Derived from
 * `recheck/markdown` by exclusion. Use with the runner's `embedded` option.
 */
export function buildApiDescriptionsPreset(): RecheckConfig {
  const rules = buildMarkdownPreset();
  for (const name of [...UNSUPPORTED, ...MEASURED_OUT]) {
    delete rules[name];
  }
  return rules;
}

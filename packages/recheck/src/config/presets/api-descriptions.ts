import type { RecheckRules } from '../../types/index.js';
import { buildMarkdownPreset } from './markdown.js';

// Keep in sync with EMBEDDED_UNSUPPORTED_RULES in core/runner.ts.
const UNSUPPORTED = [
  'recheck/single-h1',
  'recheck/first-line-h1',
  'recheck/front-matter',
  'recheck/single-trailing-newline',
  'recheck/link-fragments',
];

// Too noisy for API descriptions.
const MEASURED_OUT = ['recheck/line-length', 'recheck/ul-indent'];

/**
 * `recheck/api-descriptions`: the markdown preset minus the rules that do not
 * fit embedded markdown, such as an OpenAPI `description`. Use with the
 * `embedded` option.
 */
export function buildApiDescriptionsPreset(): RecheckRules {
  const rules = buildMarkdownPreset();
  for (const name of [...UNSUPPORTED, ...MEASURED_OUT]) {
    delete rules[name];
  }
  return rules;
}

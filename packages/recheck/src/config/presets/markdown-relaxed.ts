import type { BaseRule, RecheckRules } from '../../types/index.js';
import { buildMarkdownPreset } from './markdown.js';

/**
 * `recheck/markdown-relaxed`: the markdown preset with a few rules turned off,
 * matching markdownlint's `style/relaxed.json`.
 */
const RELAXED_OVERRIDES: Record<string, Partial<BaseRule>> = {
  // The first five rules have markdownlint's "whitespace" tag, which the
  // relaxed style turns off.
  'no-trailing-spaces': { severity: 'off' },
  'no-hard-tabs': { severity: 'off' },
  'no-multiple-blanks': { severity: 'off' },
  'no-multiple-space-blockquote': { severity: 'off' },
  'no-blanks-blockquote': { severity: 'off' },
  'line-length': { severity: 'off' },
  'ul-indent': { severity: 'off' },
  'no-inline-html': { severity: 'off' },
  'no-bare-urls': { severity: 'off' },
  'fenced-code-language': { severity: 'off' },
  'first-line-h1': { severity: 'off' },
};

export function buildMarkdownRelaxedPreset(): RecheckRules {
  const base = buildMarkdownPreset();
  const result: RecheckRules = { ...base };

  for (const [shortName, override] of Object.entries(RELAXED_OVERRIDES)) {
    const key = `recheck/${shortName}`;
    const existing = result[key];
    // Skip rules the base preset does not include.
    if (!existing) continue;
    result[key] = { ...existing, ...override };
  }

  return result;
}

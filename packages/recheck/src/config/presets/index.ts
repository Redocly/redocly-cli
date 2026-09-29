import type { RecheckRules } from '../../types/index.js';
import { buildApiDescriptionsPreset } from './api-descriptions.js';
import { buildGooglePreset } from './google.js';
import { buildInclusiveLanguagePreset } from './inclusive-language.js';
import { buildMarkdocPreset } from './markdoc.js';
import { buildMarkdownRelaxedPreset } from './markdown-relaxed.js';
import { buildMarkdownPreset } from './markdown.js';
import { buildMicrosoftPreset } from './microsoft.js';
import { buildMinimalPreset } from './minimal.js';
import { buildPlainLanguagePreset } from './plain-language.js';
import { buildProsePreset } from './prose.js';
import { buildTechnicalEnglishPreset } from './technical-english.js';

/**
 * Presets that `extends` can reference, keyed by their `recheck/<name>` id.
 *
 * `recheck/inclusive-language` and `recheck/plain-language` have no structural
 * rules. Add them next to a base preset such as `recheck/google` or
 * `recheck/prose` in a multi-entry `extends` list.
 */
export const presets: Record<string, RecheckRules> = {
  'recheck/markdown': buildMarkdownPreset(),
  'recheck/markdown-relaxed': buildMarkdownRelaxedPreset(),
  'recheck/minimal': buildMinimalPreset(),
  'recheck/prose': buildProsePreset(),
  'recheck/markdoc': buildMarkdocPreset(),
  'recheck/google': buildGooglePreset(),
  'recheck/microsoft': buildMicrosoftPreset(),
  'recheck/inclusive-language': buildInclusiveLanguagePreset(),
  'recheck/plain-language': buildPlainLanguagePreset(),
  'recheck/technical-english': buildTechnicalEnglishPreset(),
  'recheck/api-descriptions': buildApiDescriptionsPreset(),
};

/**
 * Assertions that no preset enables, because the right thresholds or word
 * lists depend on the project. The README lists a snippet for each under
 * "Opt-in prose assertions".
 */
export const DOCUMENTED_OPT_IN_ASSERTIONS = ['conditional', 'metric', 'spelling'] as const;

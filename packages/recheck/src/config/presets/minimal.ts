import type { RecheckRules } from '../../types/index.js';
import { registerPresetRules } from './markdown.js';

/** `recheck/minimal`: a small set of token rules. Each rule supplies its own message. */
const MINIMAL_PRESET_RULES = [
  'no-trailing-spaces',
  'no-hard-tabs',
  'single-trailing-newline',
  'no-reversed-links',
  'no-empty-links',
];

export function buildMinimalPreset(): RecheckRules {
  return registerPresetRules(MINIMAL_PRESET_RULES);
}

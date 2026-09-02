import type { RecheckConfig } from '../../types/index.js';
import { registerPresetRules } from './markdown.js';

/**
 * `recheck/minimal` — a small, high-signal rule set.
 *
 * Per the plan, the full set is: no-trailing-spaces, no-hard-tabs,
 * single-trailing-newline, no-reversed-links, no-empty-links. All five are
 * token rules and derive their message from their own `defaults.message`
 * — no entries needed in MINIMAL_PRESET_MESSAGES for any of them.
 */
const MINIMAL_PRESET_RULES = [
  'no-trailing-spaces',
  'no-hard-tabs',
  'single-trailing-newline',
  'no-reversed-links',
  'no-empty-links',
];

const MINIMAL_PRESET_MESSAGES: Record<string, string> = {};

export function buildMinimalPreset(): RecheckConfig {
  return registerPresetRules(MINIMAL_PRESET_RULES, MINIMAL_PRESET_MESSAGES);
}

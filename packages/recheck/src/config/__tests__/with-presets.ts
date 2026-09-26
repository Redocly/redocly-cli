import { isPlainObject } from '../../utils/is-plain-object.js';
import { presetConfigs } from '../presets/index.js';
import { mergeRecheckRules, type RecheckRulesInput } from '../public.js';

// Returns `block` with the named presets merged in, as core does for `extends`.
export function withPresets(
  names: string[],
  block: Record<string, unknown> = {}
): Record<string, unknown> {
  const presetRules = names.reduce<RecheckRulesInput>(
    (merged, name) =>
      mergeRecheckRules(merged, presetConfigs[name.replace(/^recheck\//, '')].recheck.rules),
    {}
  );
  const blockRules = isPlainObject(block.rules) ? (block.rules as RecheckRulesInput) : {};
  return { ...block, rules: mergeRecheckRules(presetRules, blockRules) };
}

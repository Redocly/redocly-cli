import { createConfig } from '@redocly/openapi-core';

import type { RecheckBlock } from '../config/resolve.js';
import { recheckPresetsPlugin } from '../presets.js';
import type { RecheckConfig } from '../types/index.js';

/** The `recheck` block that redocly.yaml resolves to for `extends: names` plus `recheck: block`. */
export async function presetBlock(
  names: string[],
  block: RecheckBlock = {}
): Promise<RecheckBlock> {
  const config = await createConfig(
    // The engine's block type is wider than the published config schema type.
    { extends: names, recheck: block as never },
    { plugins: [recheckPresetsPlugin] }
  );
  return structuredClone(config.recheck) as RecheckBlock;
}

/**
 * The engine config (rule keys at the top level) for `extends: names` plus `config`.
 * Rule keys in `config` merge on top of the preset rules; other keys are settings.
 */
export async function presetConfig(
  names: string[],
  config: Record<string, unknown> = {}
): Promise<RecheckConfig> {
  const rules: Record<string, unknown> = {};
  const settings: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    if (key.includes('/')) rules[key] = value;
    else settings[key] = value;
  }
  const { rules: merged, ...rest } = await presetBlock(names, {
    ...settings,
    rules: rules as RecheckBlock['rules'],
  });
  return { ...rest, ...merged } as RecheckConfig;
}

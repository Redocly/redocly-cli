import path from 'node:path';

import { logger } from '../logger.js';
import { isAbsoluteUrl } from '../ref-utils.js';
import { isPlainObject } from '../utils/is-plain-object.js';
import type { Plugin, RawGovernanceConfig } from './types.js';
import { parsePresetName } from './utils.js';

type IsLoaded = (pluginId: string) => boolean;

const isRuleMapKey = (key: string) => key === 'rules' || key.endsWith('Rules');
const isDecoratorMapKey = (key: string) =>
  key === 'decorators' ||
  key.endsWith('Decorators') ||
  key === 'preprocessors' ||
  key.endsWith('Preprocessors');

/**
 * Removes presets, rules, decorators and preprocessors that belong to a plugin which is not loaded.
 * Plugins listed in a config file are not evaluated in the browser, and the references to them
 * would otherwise either throw or call an assertion function that was never registered.
 */
export function skipUnloadedPluginReferences(
  node: RawGovernanceConfig,
  plugins: Plugin[]
): RawGovernanceConfig {
  const isLoaded: IsLoaded = (pluginId) => plugins.some((plugin) => plugin.id === pluginId);
  const skipped: string[] = [];
  const result: Record<string, unknown> = { ...node };

  if (Array.isArray(node.extends)) {
    result.extends = node.extends.filter((presetName) => {
      if (typeof presetName !== 'string' || !usesUnloadedPluginPreset(presetName, isLoaded)) {
        return true;
      }
      skipped.push(presetName);
      return false;
    });
  }

  for (const [key, value] of Object.entries(node)) {
    const isRuleMap = isRuleMapKey(key);
    if ((!isRuleMap && !isDecoratorMapKey(key)) || !isPlainObject(value)) {
      continue;
    }

    result[key] = Object.fromEntries(
      Object.entries(value).filter(([name, settings]) => {
        const unloaded = isRuleMap
          ? usesUnloadedPluginRule(name, settings, isLoaded)
          : usesUnloadedPluginId(name, isLoaded);
        if (unloaded) {
          skipped.push(name);
        }
        return !unloaded;
      })
    );
  }

  if (skipped.length > 0) {
    logger.warn(
      `Skipped because their plugin is not loaded in the browser: ${skipped.join(', ')}.\n`
    );
  }

  return result as RawGovernanceConfig;
}

function usesUnloadedPluginPreset(presetName: string, isLoaded: IsLoaded): boolean {
  if (isAbsoluteUrl(presetName) || path.extname(presetName)) {
    return false;
  }
  return !isLoaded(parsePresetName(presetName).pluginId);
}

// A `pluginId/name` key, where `rule/` marks a custom assertion rule rather than a plugin.
function usesUnloadedPluginId(name: string, isLoaded: IsLoaded): boolean {
  const [pluginId, rest] = name.split('/');
  return !!rest && pluginId !== 'rule' && !isLoaded(pluginId);
}

function usesUnloadedPluginRule(name: string, settings: unknown, isLoaded: IsLoaded): boolean {
  if (usesUnloadedPluginId(name, isLoaded)) {
    return true;
  }
  if (!name.startsWith('rule/') || !isPlainObject(settings)) {
    return false;
  }

  const where = Array.isArray(settings.where) ? settings.where : [];
  return [settings, ...where].some(
    (definition) =>
      isPlainObject(definition) &&
      isPlainObject(definition.assertions) &&
      Object.keys(definition.assertions).some((field) => {
        const [pluginId, fn] = field.split('/');
        return !!pluginId && !!fn && !isLoaded(pluginId);
      })
  );
}

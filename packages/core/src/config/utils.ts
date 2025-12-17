import { assignOnlyExistingConfig, assignConfig } from '../utils/assign-config.js';
import { isPlainObject } from '../utils/is-plain-object.js';

import type { ImportedPlugin, ResolvedGovernanceConfig, Plugin, PluginCreator } from './types.js';
import type {
  Oas3RuleSet,
  Oas2RuleSet,
  Async3RuleSet,
  Async2RuleSet,
  Arazzo1RuleSet,
  Overlay1RuleSet,
  OpenRpc1RuleSet,
} from '../oas-types.js';

export function parsePresetName(presetName: string): { pluginId: string; configName: string } {
  if (presetName.indexOf('/') > -1) {
    const [pluginId, configName] = presetName.split('/');
    return { pluginId, configName };
  } else {
    return { pluginId: '', configName: presetName };
  }
}

export function prefixRules<
  T extends
    | Oas3RuleSet
    | Oas2RuleSet
    | Async3RuleSet
    | Async2RuleSet
    | Arazzo1RuleSet
    | Overlay1RuleSet
    | OpenRpc1RuleSet
>(rules: T, prefix: string) {
  if (!prefix) return rules;

  const res = {} as T;
  for (const name of Object.keys(rules)) {
    res[`${prefix}/${name}`] = rules[name];
  }

  return res;
}

export function mergeExtends(rulesConfList: ResolvedGovernanceConfig[]) {
  const result: Required<ResolvedGovernanceConfig> = {
    rules: {},
    oas2Rules: {},
    oas3_0Rules: {},
    oas3_1Rules: {},
    oas3_2Rules: {},
    async2Rules: {},
    async3Rules: {},
    arazzo1Rules: {},
    overlay1Rules: {},
    openrpc1Rules: {},

    preprocessors: {},
    oas2Preprocessors: {},
    oas3_0Preprocessors: {},
    oas3_1Preprocessors: {},
    oas3_2Preprocessors: {},
    async2Preprocessors: {},
    async3Preprocessors: {},
    arazzo1Preprocessors: {},
    overlay1Preprocessors: {},
    openrpc1Preprocessors: {},

    decorators: {},
    oas2Decorators: {},
    oas3_0Decorators: {},
    oas3_1Decorators: {},
    oas3_2Decorators: {},
    async2Decorators: {},
    async3Decorators: {},
    arazzo1Decorators: {},
    overlay1Decorators: {},
    openrpc1Decorators: {},
  };

  for (const rulesConf of rulesConfList) {
    if (isPlainObject(rulesConf) && 'extends' in rulesConf && rulesConf.extends !== undefined) {
      throw new Error(
        `'extends' is not supported in shared configs yet:\n${JSON.stringify(rulesConf, null, 2)}`
      );
    }

    assignConfig(result.rules, rulesConf.rules);
    assignConfig(result.oas2Rules, rulesConf.oas2Rules);
    assignOnlyExistingConfig(result.oas2Rules, rulesConf.rules);
    assignConfig(result.oas3_0Rules, rulesConf.oas3_0Rules);
    assignOnlyExistingConfig(result.oas3_0Rules, rulesConf.rules);
    assignConfig(result.oas3_1Rules, rulesConf.oas3_1Rules);
    assignOnlyExistingConfig(result.oas3_1Rules, rulesConf.rules);
    assignConfig(result.oas3_2Rules, rulesConf.oas3_2Rules);
    assignOnlyExistingConfig(result.oas3_2Rules, rulesConf.rules);
    assignConfig(result.async2Rules, rulesConf.async2Rules);
    assignOnlyExistingConfig(result.async2Rules, rulesConf.rules);
    assignConfig(result.async3Rules, rulesConf.async3Rules);
    assignOnlyExistingConfig(result.async3Rules, rulesConf.rules);
    assignConfig(result.arazzo1Rules, rulesConf.arazzo1Rules);
    assignOnlyExistingConfig(result.arazzo1Rules, rulesConf.rules);
    assignConfig(result.overlay1Rules, rulesConf.overlay1Rules);
    assignOnlyExistingConfig(result.overlay1Rules, rulesConf.rules);
    assignConfig(result.openrpc1Rules, rulesConf.openrpc1Rules);
    assignOnlyExistingConfig(result.openrpc1Rules, rulesConf.rules);

    assignConfig(result.preprocessors, rulesConf.preprocessors);
    assignConfig(result.oas2Preprocessors, rulesConf.oas2Preprocessors);
    assignOnlyExistingConfig(result.oas2Preprocessors, rulesConf.preprocessors);
    assignConfig(result.oas3_0Preprocessors, rulesConf.oas3_0Preprocessors);
    assignOnlyExistingConfig(result.oas3_0Preprocessors, rulesConf.preprocessors);
    assignConfig(result.oas3_1Preprocessors, rulesConf.oas3_1Preprocessors);
    assignOnlyExistingConfig(result.oas3_1Preprocessors, rulesConf.preprocessors);
    assignConfig(result.oas3_2Preprocessors, rulesConf.oas3_2Preprocessors);
    assignOnlyExistingConfig(result.oas3_2Preprocessors, rulesConf.preprocessors);
    assignConfig(result.async2Preprocessors, rulesConf.async2Preprocessors);
    assignOnlyExistingConfig(result.async2Preprocessors, rulesConf.preprocessors);
    assignConfig(result.async3Preprocessors, rulesConf.async3Preprocessors);
    assignOnlyExistingConfig(result.async3Preprocessors, rulesConf.preprocessors);
    assignConfig(result.arazzo1Preprocessors, rulesConf.arazzo1Preprocessors);
    assignOnlyExistingConfig(result.arazzo1Preprocessors, rulesConf.preprocessors);
    assignConfig(result.overlay1Preprocessors, rulesConf.overlay1Preprocessors);
    assignOnlyExistingConfig(result.overlay1Preprocessors, rulesConf.preprocessors);
    assignConfig(result.openrpc1Preprocessors, rulesConf.openrpc1Preprocessors);
    assignOnlyExistingConfig(result.openrpc1Preprocessors, rulesConf.preprocessors);

    assignConfig(result.decorators, rulesConf.decorators);
    assignConfig(result.oas2Decorators, rulesConf.oas2Decorators);
    assignOnlyExistingConfig(result.oas2Decorators, rulesConf.decorators);
    assignConfig(result.oas3_0Decorators, rulesConf.oas3_0Decorators);
    assignOnlyExistingConfig(result.oas3_0Decorators, rulesConf.decorators);
    assignConfig(result.oas3_1Decorators, rulesConf.oas3_1Decorators);
    assignOnlyExistingConfig(result.oas3_1Decorators, rulesConf.decorators);
    assignConfig(result.oas3_2Decorators, rulesConf.oas3_2Decorators);
    assignOnlyExistingConfig(result.oas3_2Decorators, rulesConf.decorators);
    assignConfig(result.async2Decorators, rulesConf.async2Decorators);
    assignOnlyExistingConfig(result.async2Decorators, rulesConf.decorators);
    assignConfig(result.async3Decorators, rulesConf.async3Decorators);
    assignOnlyExistingConfig(result.async3Decorators, rulesConf.decorators);
    assignConfig(result.arazzo1Decorators, rulesConf.arazzo1Decorators);
    assignOnlyExistingConfig(result.arazzo1Decorators, rulesConf.decorators);
    assignConfig(result.overlay1Decorators, rulesConf.overlay1Decorators);
    assignOnlyExistingConfig(result.overlay1Decorators, rulesConf.decorators);
    assignConfig(result.openrpc1Decorators, rulesConf.openrpc1Decorators);
    assignOnlyExistingConfig(result.openrpc1Decorators, rulesConf.decorators);
  }

  return result;
}

export class ConfigValidationError extends Error {}

export function deepCloneMapWithJSON<K, V>(originalMap: Map<K, V>): Map<K, V> {
  return new Map(JSON.parse(JSON.stringify([...originalMap])));
}

export function isDeprecatedPluginFormat(plugin: ImportedPlugin | undefined): plugin is Plugin {
  return plugin !== undefined && typeof plugin === 'object' && 'id' in plugin;
}

export function isCommonJsPlugin(plugin: ImportedPlugin | undefined): plugin is PluginCreator {
  return typeof plugin === 'function';
}

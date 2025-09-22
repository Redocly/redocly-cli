import { assignOnlyExistingConfig, assignConfig, isPlainObject } from '../utils.js';

import type {
  ImportedPlugin,
  RawResolveConfig,
  ResolveConfig,
  ResolvedGovernanceConfig,
  Plugin,
  PluginCreator,
} from './types.js';
import type {
  Oas3RuleSet,
  Oas2RuleSet,
  Async3RuleSet,
  Async2RuleSet,
  Arazzo1RuleSet,
  Overlay1RuleSet,
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
    async2Rules: {},
    async3Rules: {},
    arazzo1Rules: {},
    overlay1Rules: {},

    preprocessors: {},
    oas2Preprocessors: {},
    oas3_0Preprocessors: {},
    oas3_1Preprocessors: {},
    async2Preprocessors: {},
    async3Preprocessors: {},
    arazzo1Preprocessors: {},
    overlay1Preprocessors: {},

    decorators: {},
    oas2Decorators: {},
    oas3_0Decorators: {},
    oas3_1Decorators: {},
    async2Decorators: {},
    async3Decorators: {},
    arazzo1Decorators: {},
    overlay1Decorators: {},
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
    assignConfig(result.async2Rules, rulesConf.async2Rules);
    assignOnlyExistingConfig(result.async2Rules, rulesConf.rules);
    assignConfig(result.async3Rules, rulesConf.async3Rules);
    assignOnlyExistingConfig(result.async3Rules, rulesConf.rules);
    assignConfig(result.arazzo1Rules, rulesConf.arazzo1Rules);
    assignOnlyExistingConfig(result.arazzo1Rules, rulesConf.rules);
    assignConfig(result.overlay1Rules, rulesConf.overlay1Rules);
    assignOnlyExistingConfig(result.overlay1Rules, rulesConf.rules);

    assignConfig(result.preprocessors, rulesConf.preprocessors);
    assignConfig(result.oas2Preprocessors, rulesConf.oas2Preprocessors);
    assignOnlyExistingConfig(result.oas2Preprocessors, rulesConf.preprocessors);
    assignConfig(result.oas3_0Preprocessors, rulesConf.oas3_0Preprocessors);
    assignOnlyExistingConfig(result.oas3_0Preprocessors, rulesConf.preprocessors);
    assignConfig(result.oas3_1Preprocessors, rulesConf.oas3_1Preprocessors);
    assignOnlyExistingConfig(result.oas3_1Preprocessors, rulesConf.preprocessors);
    assignConfig(result.async2Preprocessors, rulesConf.async2Preprocessors);
    assignOnlyExistingConfig(result.async2Preprocessors, rulesConf.preprocessors);
    assignConfig(result.async3Preprocessors, rulesConf.async3Preprocessors);
    assignOnlyExistingConfig(result.async3Preprocessors, rulesConf.preprocessors);
    assignConfig(result.arazzo1Preprocessors, rulesConf.arazzo1Preprocessors);
    assignOnlyExistingConfig(result.arazzo1Preprocessors, rulesConf.preprocessors);
    assignConfig(result.overlay1Preprocessors, rulesConf.overlay1Preprocessors);
    assignOnlyExistingConfig(result.overlay1Preprocessors, rulesConf.preprocessors);

    assignConfig(result.decorators, rulesConf.decorators);
    assignConfig(result.oas2Decorators, rulesConf.oas2Decorators);
    assignOnlyExistingConfig(result.oas2Decorators, rulesConf.decorators);
    assignConfig(result.oas3_0Decorators, rulesConf.oas3_0Decorators);
    assignOnlyExistingConfig(result.oas3_0Decorators, rulesConf.decorators);
    assignConfig(result.oas3_1Decorators, rulesConf.oas3_1Decorators);
    assignOnlyExistingConfig(result.oas3_1Decorators, rulesConf.decorators);
    assignConfig(result.async2Decorators, rulesConf.async2Decorators);
    assignOnlyExistingConfig(result.async2Decorators, rulesConf.decorators);
    assignConfig(result.async3Decorators, rulesConf.async3Decorators);
    assignOnlyExistingConfig(result.async3Decorators, rulesConf.decorators);
    assignConfig(result.arazzo1Decorators, rulesConf.arazzo1Decorators);
    assignOnlyExistingConfig(result.arazzo1Decorators, rulesConf.decorators);
    assignConfig(result.overlay1Decorators, rulesConf.overlay1Decorators);
    assignOnlyExistingConfig(result.overlay1Decorators, rulesConf.decorators);
  }

  return result;
}

export function getResolveConfig(resolve?: RawResolveConfig): ResolveConfig {
  return {
    http: {
      headers: resolve?.http?.headers ?? [],
      customFetch: undefined,
    },
  };
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

export function interpolateEnvVariables(value: string): {
  interpolatedValue: string;
  unsetVars: string[];
  interpolatedVars: string[];
} {
  let interpolatedValue = value;
  const missingEnvVars = new Set<string>();
  const resolvedEnvVars = new Set<string>();
  const matches = [...value.matchAll(/{{\s*process\.env\.([A-Z0-9_]+)\s*}}/gi)];

  for (const match of matches) {
    const envName = match[1].toUpperCase();
    const envValue = process.env[envName];

    if (envValue === undefined) {
      missingEnvVars.add(envName);
    } else {
      interpolatedValue = interpolatedValue.replace(match[0], envValue);
      resolvedEnvVars.add(envName);
    }
  }

  return {
    interpolatedValue,
    unsetVars: Array.from(missingEnvVars),
    interpolatedVars: Array.from(resolvedEnvVars),
  };
}

export function replaceEnvVariablesDeep<T extends Record<string, unknown> | Array<unknown>>(
  obj: T,
  currentPath: string[] = []
): {
  resolvedObj: T;
  unsetEnvVars: string[];
  interpolatedEnvVars: string[];
  replacedValues: Record<string, { original: string; replaced: string }>;
} {
  const unsetEnvVars = new Set<string>();
  const interpolatedEnvVars = new Set<string>();
  const replacedValues: Record<string, { original: string; replaced: string }> = {};

  if (!isPlainObject(obj) && !Array.isArray(obj)) {
    return {
      resolvedObj: obj,
      unsetEnvVars: Array.from(unsetEnvVars),
      interpolatedEnvVars: Array.from(interpolatedEnvVars),
      replacedValues,
    };
  }

  const resolvedObj = Object.entries(obj).reduce(
    (acc, [key, value]) => {
      const path = currentPath.concat(key);

      if (typeof value === 'string') {
        const { interpolatedValue, unsetVars, interpolatedVars } = interpolateEnvVariables(value);

        (acc as Record<string, unknown>)[key] = interpolatedValue;

        for (const unsetVar of unsetVars) {
          unsetEnvVars.add(unsetVar);
        }

        for (const interpolatedVar of interpolatedVars) {
          interpolatedEnvVars.add(interpolatedVar);
        }

        // If any variables were resolved, store the original and replaced values
        if (interpolatedVars.length > 0) {
          replacedValues[path.join(':')] = {
            original: value,
            replaced: interpolatedValue,
          };
        }
      } else if (isPlainObject(value) || Array.isArray(value)) {
        const result = replaceEnvVariablesDeep(value as T, path);
        (acc as Record<string, unknown>)[key] = result.resolvedObj;

        // Merge results from nested call
        for (const unsetEnvVar of result.unsetEnvVars) {
          unsetEnvVars.add(unsetEnvVar);
        }
        for (const interpolatedEnvVar of result.interpolatedEnvVars) {
          interpolatedEnvVars.add(interpolatedEnvVar);
        }
        Object.assign(replacedValues, result.replacedValues);
      } else {
        (acc as Record<string, unknown>)[key] = value;
      }
      return acc;
    },
    Array.isArray(obj) ? ([] as unknown as T) : ({} as T)
  );

  return {
    resolvedObj,
    unsetEnvVars: Array.from(unsetEnvVars),
    interpolatedEnvVars: Array.from(interpolatedEnvVars),
    replacedValues,
  };
}

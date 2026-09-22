import { logger } from '../logger.js';
import {
  asserts,
  buildAssertCustomFunction,
  type Asserts,
  type AssertionFn,
} from '../rules/common/assertions/asserts.js';
import type {
  RawAssertion,
  AssertionDefinition,
  Assertion,
} from '../rules/common/assertions/index.js';
import { isPlainObject } from '../utils/is-plain-object.js';
import type { RawGovernanceConfig, RuleConfig, Plugin } from './types.js';

export function groupAssertionRules(
  config: RawGovernanceConfig,
  plugins: Plugin[],
  pluginsEvaluated = true
): Record<string, RuleConfig> {
  if (!config.rules) {
    return {};
  }

  // Create a new record to avoid mutating original
  const transformedRules: Record<string, RuleConfig> = {};

  // Collect assertion rules
  const assertions: Assertion[] = [];
  for (const [ruleKey, rule] of Object.entries(config.rules)) {
    if (ruleKey.startsWith('rule/') && isPlainObject(rule)) {
      const assertion = rule as RawAssertion;

      // We may have custom assertions inside the where block too
      const definitions = [assertion, ...(assertion.where || [])];

      if (
        plugins &&
        !definitions.every((definition) =>
          registerCustomAssertions(plugins, definition, pluginsEvaluated)
        )
      ) {
        logger.warn(`Rule ${ruleKey} is skipped: its plugin is not evaluated.\n`);
        continue;
      }
      assertions.push({
        ...assertion,
        assertionId: ruleKey,
      });
    } else {
      // If it's not an assertion, keep it as is
      transformedRules[ruleKey] = rule;
    }
  }
  if (assertions.length > 0) {
    transformedRules.assertions = assertions;
  }

  return transformedRules;
}

// Returns false when the rule has to be skipped because its plugin is not available.
function registerCustomAssertions(
  plugins: Plugin[],
  assertion: AssertionDefinition,
  pluginsEvaluated: boolean
): boolean {
  for (const field of Object.keys(assertion.assertions || {})) {
    const [pluginId, fn] = field.split('/');

    if (!pluginId || !fn) continue;

    const plugin = plugins.find((plugin) => plugin.id === pluginId);

    if (!plugin) {
      if (!pluginsEvaluated) return false;
      throw Error(`Plugin ${pluginId} isn't found.`);
    }

    if (!plugin.assertions || !plugin.assertions[fn]) {
      throw Error(`Plugin ${pluginId} doesn't export assertions function with name ${fn}.`);
    }

    (asserts as Asserts & { [name: string]: AssertionFn })[field] = buildAssertCustomFunction(
      plugin.assertions[fn]
    );
  }

  return true;
}

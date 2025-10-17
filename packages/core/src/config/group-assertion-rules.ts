import { asserts, buildAssertCustomFunction } from '../rules/common/assertions/asserts.js';

import type { RawAssertion, AssertionDefinition, Assertion } from '../rules/common/assertions';
import type { Asserts, AssertionFn } from '../rules/common/assertions/asserts';
import type { RawGovernanceConfig, RuleConfig, Plugin } from './types';

export function groupAssertionRules(
  config: RawGovernanceConfig,
  plugins: Plugin[]
): Record<string, RuleConfig> {
  if (!config.rules) {
    return {};
  }

  // Create a new record to avoid mutating original
  const transformedRules: Record<string, RuleConfig> = {};

  // Collect assertion rules
  const assertions: Assertion[] = [];
  for (const [ruleKey, rule] of Object.entries(config.rules)) {
    if (ruleKey.startsWith('rule/') && typeof rule === 'object' && rule !== null) {
      const assertion = rule as RawAssertion;

      if (plugins) {
        registerCustomAssertions(plugins, assertion);

        // We may have custom assertion inside where block
        for (const context of assertion.where || []) {
          registerCustomAssertions(plugins, context);
        }
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

function registerCustomAssertions(plugins: Plugin[], assertion: AssertionDefinition) {
  for (const field of Object.keys(assertion.assertions || {})) {
    const [pluginId, fn] = field.split('/');

    if (!pluginId || !fn) continue;

    const plugin = plugins.find((plugin) => plugin.id === pluginId);

    if (!plugin) {
      throw Error(`Plugin ${pluginId} isn't found.`);
    }

    if (!plugin.assertions || !plugin.assertions[fn]) {
      throw Error(`Plugin ${pluginId} doesn't export assertions function with name ${fn}.`);
    }

    (asserts as Asserts & { [name: string]: AssertionFn })[field] = buildAssertCustomFunction(
      plugin.assertions[fn]
    );
  }
}

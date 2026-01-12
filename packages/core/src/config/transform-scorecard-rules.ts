import { entityNodeTypes } from '../types/entity-types.js';

import type {
  Assertion,
  AssertionDefinition,
  RawAssertion,
} from '../rules/common/assertions/index.js';
import type { Plugin, RuleConfig } from './types.js';

export type AssertionRule = {
  type: 'entityRule' | 'apiRule' | 'otherRule';
  assertion: Assertion;
};

export type AssertionConfig = Record<string, AssertionRule>;

export function transformScorecardRulesToAssertions(
  rules: RuleConfig,
  _plugins?: Plugin[]
): AssertionConfig {
  const assertionConfig: AssertionConfig = {};

  for (const [ruleKey, ruleValue] of Object.entries(rules)) {
    if (isEntityRule(ruleValue)) {
      const entityRule = ruleValue as RawAssertion;

      if (entityRule.severity === 'off') {
        continue;
      }

      const assertion = returnAssertion('entityRule', ruleKey, entityRule);

      assertionConfig[ruleKey] = assertion;
    } else if (ruleKey.startsWith('rule/') && typeof ruleValue === 'object' && ruleValue !== null) {
      const rawAssertion = ruleValue as RawAssertion;

      const assertion = returnAssertion('apiRule', ruleKey, rawAssertion);

      assertionConfig[ruleKey] = assertion;
    }
  }

  return assertionConfig;
}

function isEntityRule(ruleValue: AssertionDefinition): boolean {
  return (
    typeof ruleValue === 'object' &&
    ruleValue !== null &&
    'assertions' in ruleValue &&
    entityNodeTypes.hasOwnProperty(ruleValue.subject.type)
  );
}

function returnAssertion(type: string, ruleKey: string, rawAssertion: RawAssertion): AssertionRule {
  return {
    type: type as 'entityRule' | 'apiRule' | 'otherRule',
    assertion: buildAssertion(ruleKey, rawAssertion),
  };
}

function buildAssertion(ruleKey: string, rawAssertion: RawAssertion): Assertion {
  return {
    assertionId: ruleKey,
    subject: rawAssertion.subject,
    assertions: rawAssertion.assertions,
    ...(rawAssertion.where && { where: rawAssertion.where }),
    ...(rawAssertion.message && { message: rawAssertion.message }),
    ...(rawAssertion.severity && { severity: rawAssertion.severity }),
  };
}

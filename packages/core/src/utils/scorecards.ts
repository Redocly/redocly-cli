import { entityNodeTypes } from '../types/entity-types.js';

import type { Assertion, RawAssertion } from '../rules/common/assertions/index.js';
import type { Plugin, RuleConfig } from '../config/types.js';
import type { Document } from '../resolve.js';

type AssertionConfig = Record<string, Assertion | RuleConfig>;

type CategorizedAssertions = {
  entityRules: Assertion[];
  apiRules: Array<Assertion | { ruleId: string; config: RuleConfig }>;
  otherRules: Record<string, unknown>;
};

export function transformScorecardRulesToAssertions(
  rules: RuleConfig,
  _plugins?: Plugin[]
): AssertionConfig {
  const assertionConfig: AssertionConfig = {};

  for (const [ruleKey, ruleValue] of Object.entries(rules)) {
    if (isAssertionRule(ruleValue)) {
      const rawAssertion = ruleValue as RawAssertion;

      if (rawAssertion.severity === 'off') {
        continue;
      }

      //TODO: uncomment once plugins with decorators are supported in scorecards
      // if (plugins) {
      //   registerCustomAssertions(plugins, rawAssertion);
      //   // We may have custom assertion inside where block
      //   for (const context of rawAssertion.where || []) {
      //     registerCustomAssertions(plugins, context);
      //   }
      // }

      assertionConfig[ruleKey] = buildAssertion(ruleKey, rawAssertion);
    } else {
      assertionConfig[ruleKey] = ruleValue;
    }
  }

  return assertionConfig;
}

export function categorizeAssertions(assertionConfig: AssertionConfig): CategorizedAssertions {
  const entityRules: Assertion[] = [];
  const apiRules: Array<Assertion | { ruleId: string; config: RuleConfig }> = [];
  const otherRules: Record<string, unknown> = {};

  for (const [ruleKey, ruleValue] of Object.entries(assertionConfig)) {
    if (isAssertion(ruleValue)) {
      if (isEntityAssertion(ruleValue)) {
        entityRules.push(ruleValue);
      } else if (isApiAssertion(ruleKey, ruleValue)) {
        apiRules.push(ruleValue);
      } else {
        otherRules[ruleKey] = ruleValue;
      }
    } else {
      apiRules.push({ ruleId: ruleKey, config: ruleValue });
    }
  }

  return { entityRules, apiRules, otherRules };
}

export function apiRulesToConfig(
  apiRules: Array<Assertion | { ruleId: string; config: RuleConfig }>
): Record<string, Assertion | RuleConfig> {
  return Object.fromEntries(
    apiRules.map((rule) => {
      if ('assertionId' in rule) {
        return [rule.assertionId, rule];
      } else {
        return [rule.ruleId, rule.config];
      }
    })
  );
}

export function findDataSchemaInDocument(schemaKey: string, schema: string, document: Document) {
  const dataSchema = JSON.parse(schema);

  if (!hasComponents(document.parsed)) {
    return null;
  }

  const components = document.parsed.components as Record<string, unknown>;
  const schemas =
    'schemas' in components ? (components.schemas as Record<string, unknown>) : undefined;
  if (!schemas) {
    throw new Error('No schemas found in document components');
  }

  if (typeof schemas === 'object') {
    for (const [key, value] of Object.entries(schemas)) {
      if (key === schemaKey) {
        if (JSON.stringify(value) === JSON.stringify(dataSchema)) {
          return value;
        }
      }
    }
  }

  return null;
}

function isAssertion(value: unknown): value is Assertion {
  return (
    typeof value === 'object' &&
    value !== null &&
    'assertionId' in value &&
    'subject' in value &&
    'assertions' in value
  );
}

function isAssertionRule(ruleValue: unknown): boolean {
  return (
    typeof ruleValue === 'object' &&
    ruleValue !== null &&
    'assertions' in ruleValue &&
    'subject' in ruleValue
  );
}

function isEntityAssertion(assertion: Assertion): boolean {
  return (
    typeof assertion === 'object' &&
    assertion !== null &&
    'subject' in assertion &&
    typeof assertion.subject === 'object' &&
    'type' in assertion.subject &&
    entityNodeTypes.hasOwnProperty(assertion.subject.type)
  );
}

function isApiAssertion(ruleKey: string, assertion: Assertion): boolean {
  return (
    ruleKey.startsWith('rule/') &&
    typeof assertion === 'object' &&
    assertion !== null &&
    !isEntityAssertion(assertion)
  );
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

function hasComponents(parsed: unknown): parsed is { [key: string]: unknown } {
  return (
    typeof parsed === 'object' &&
    parsed !== null &&
    'components' in parsed &&
    typeof (parsed as Record<string, unknown>).components === 'object'
  );
}

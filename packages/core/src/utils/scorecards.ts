// Fix issue on yarn and windows with dynamic import of @redocly/config
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { NODE_TYPE_NAMES } = require('@redocly/config');

import { dequal } from './dequal.js';
import { isPlainObject } from './is-plain-object.js';

import type { Assertion, RawAssertion } from '../rules/common/assertions/index.js';
import type { RuleConfig } from '../config/types.js';
import type { Document } from '../resolve.js';

export type AssertionConfig = Record<string, Assertion | RuleConfig>;

type AssertionsByTarget = {
  entityRules: Record<string, Assertion>;
  apiRules: Record<string, Assertion | RuleConfig>;
};

function transformEntityTypeName(subjectType: string, entityType: string): string {
  const capitalizedEntityType = entityType
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

  const specificType = capitalizedEntityType + subjectType;

  if ((Object.values(NODE_TYPE_NAMES) as string[]).includes(specificType)) {
    return specificType;
  }

  return subjectType;
}

export function transformScorecardRulesToAssertions(
  entityType: string,
  rules: RuleConfig
): AssertionConfig {
  const assertionConfig: AssertionConfig = {};

  for (const [ruleKey, ruleValue] of Object.entries(rules)) {
    if (isAssertionRule(ruleKey, ruleValue)) {
      if (ruleValue.severity === 'off') {
        continue;
      }

      assertionConfig[ruleKey] = {
        ...buildAssertionWithNormalizedTypes(entityType, ruleKey, ruleValue),
      };
    } else {
      assertionConfig[ruleKey] = ruleValue;
    }
  }

  return assertionConfig;
}

export function categorizeAssertions(assertionConfig: AssertionConfig): AssertionsByTarget {
  const entityRules: Record<string, Assertion> = {};
  const apiRules: Record<string, Assertion | RuleConfig> = {};
  for (const [ruleKey, ruleValue] of Object.entries(assertionConfig)) {
    if (isAssertionRule(ruleKey, ruleValue)) {
      const assertion = ruleValue as Assertion;
      if (isEntityAssertion(assertion)) {
        entityRules[ruleKey] = assertion;
      } else {
        apiRules[ruleKey] = assertion;
      }
    } else {
      apiRules[ruleKey] = ruleValue;
    }
  }

  return { entityRules, apiRules };
}

export function findDataSchemaInDocument(
  schemaKey: string,
  schemaJson: string,
  document: Document
): unknown {
  if (!isPlainObject(document.parsed) || !isPlainObject(document.parsed.components)) {
    return null;
  }

  const components = document.parsed.components as Record<string, unknown>;
  const schemas =
    'schemas' in components ? (components.schemas as Record<string, unknown>) : undefined;

  if (!schemas || !(schemaKey in schemas)) {
    return null;
  }

  const foundSchema = schemas[schemaKey];

  try {
    const expectedSchema = JSON.parse(schemaJson);
    if (dequal(foundSchema, expectedSchema)) {
      return foundSchema;
    }
  } catch {
    return null;
  }

  return null;
}

function isAssertionRule(ruleKey: string, ruleValue: unknown): ruleValue is RawAssertion {
  return ruleKey.startsWith('rule/') && isPlainObject(ruleValue);
}

function isEntityAssertion(assertion: Assertion): boolean {
  return Object.values(NODE_TYPE_NAMES).some(
    (entityTypeName) => assertion.subject.type === entityTypeName
  );
}

function buildAssertionWithNormalizedTypes(
  entityType: string,
  ruleKey: string,
  rawAssertion: RawAssertion
): Assertion {
  const transformedSubjectType = transformEntityTypeName(rawAssertion.subject.type, entityType);

  const transformedWhere = rawAssertion.where?.map((whereClause) => ({
    ...whereClause,
    subject: {
      ...whereClause.subject,
      type: transformEntityTypeName(whereClause.subject.type, entityType),
    },
  }));

  return {
    assertionId: ruleKey,
    subject: {
      ...rawAssertion.subject,
      type: transformedSubjectType,
    },
    assertions: rawAssertion.assertions,
    ...(transformedWhere && { where: transformedWhere }),
    ...(rawAssertion.message && { message: rawAssertion.message }),
    ...(rawAssertion.severity && { severity: rawAssertion.severity }),
  };
}

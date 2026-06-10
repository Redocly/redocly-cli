import { Location } from '../ref-utils.js';
import { asserts, type AssertionFnContext } from '../rules/common/assertions/asserts.js';
import type { Assertion } from '../rules/common/assertions/index.js';
import { getAssertsToApply, type AssertToApply } from '../rules/common/assertions/utils.js';
import { isPlainObject } from '../utils/is-plain-object.js';
import type { ProblemSeverity } from '../walk.js';
import type {
  GraphqlNodeKind,
  GraphqlRule,
  GraphqlUserContext,
  GraphqlVisitor,
} from './visitor.js';

/**
 * GraphQL-native adapter for configurable rules.
 * It reuses the shared `asserts` check functions and `getAssertsToApply`, but targets GraphQL AST Kinds and reports by AST node instead of walking the JSON tree.
 * @param configurableRulesObject - The object containing the configurable rules.
 */
export const GraphqlAssertions: GraphqlRule = (
  configurableRulesObject: Record<string, unknown>
): GraphqlVisitor[] => {
  const assertions = Object.values(configurableRulesObject).filter(isPlainObject<Assertion>);
  const visitors: GraphqlVisitor[] = [];

  for (const assertion of assertions) {
    if (assertion.severity === 'off') continue;

    const kind = assertion.subject?.type as GraphqlNodeKind | undefined;
    if (!kind) continue;

    const assertsToApply = getAssertsToApply(assertion);

    visitors.push({
      [kind]: (node: any, ctx: GraphqlUserContext) =>
        runGraphqlAssertion(node, ctx, assertion, assertsToApply),
    });
  }

  return visitors;
};

function runGraphqlAssertion(
  node: any,
  ctx: GraphqlUserContext,
  assertion: Assertion,
  assertsToApply: AssertToApply[]
): void {
  const property = singleProperty(assertion.subject.property);
  const target = property === undefined ? node : node[property];
  const value = unwrapValue(target);

  // The shared asserts report against a `Location`; GraphQL reports by node, so the location is unused.
  const baseLocation = new Location(ctx.source, '#/');

  for (const assert of assertsToApply) {
    const results = asserts[assert.name](value, assert.conditions, {
      baseLocation,
      rawValue: value,
    } as AssertionFnContext);

    for (const result of results) {
      ctx.report({
        message: assertion.message ?? result.message ?? '',
        node: isAstNode(target) ? target : node,
        suggest: assertion.suggest,
        ruleId: assertion.assertionId,
        // 'off' assertions are skipped above, so the remaining severities are reportable.
        severity: assertion.severity as ProblemSeverity | undefined,
      });
    }
  }
}

function singleProperty(property: Assertion['subject']['property']): string | undefined {
  return Array.isArray(property) ? property[0] : property;
}

// GraphQL name-bearing properties (e.g. `name`) are `{ kind, value }` nodes; unwrap to the scalar the asserts expect, leaving plain scalars untouched.
function unwrapValue(target: unknown): unknown {
  return isPlainObject(target) && 'value' in target ? target.value : target;
}

function isAstNode(target: unknown): boolean {
  return isPlainObject(target) && 'kind' in target;
}

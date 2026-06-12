import { colorize } from '../logger.js';
import { Location } from '../ref-utils.js';
import { asserts, type AssertionFnContext } from '../rules/common/assertions/asserts.js';
import type { Assertion, AssertionDefinition } from '../rules/common/assertions/index.js';
import {
  getAssertsToApply,
  getFilenameFromPath,
  getProblemsMessage,
  interpolateMessagePlaceholders,
  type AssertToApply,
} from '../rules/common/assertions/utils.js';
import { isPlainObject } from '../utils/is-plain-object.js';
import { isString } from '../utils/is-string.js';
import type { ProblemSeverity } from '../walk.js';
import type {
  GraphqlNodeKind,
  GraphqlRule,
  GraphqlUserContext,
  GraphqlVisitor,
} from './visitor.js';

type WhereMatcher = {
  kind: GraphqlNodeKind;
  definition: AssertionDefinition;
  assertsToApply: AssertToApply[];
};

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
    const whereMatchers = buildWhereMatchers(assertion);

    visitors.push({
      [kind]: (node: any, ctx: GraphqlUserContext) => {
        if (!matchesWhere(node, ctx, whereMatchers)) return;
        runGraphqlAssertion(node, ctx, assertion, assertsToApply);
      },
    });
  }

  return visitors;
};

function buildWhereMatchers(assertion: Assertion): WhereMatcher[] {
  if (!Array.isArray(assertion.where)) return [];

  return assertion.where.map((definition, index) => {
    if (!isString(definition.subject?.type)) {
      throw new Error(
        `${assertion.assertionId} -> where -> [${index}]: 'type' (String) is required`
      );
    }
    return {
      kind: definition.subject.type as GraphqlNodeKind,
      definition,
      assertsToApply: getAssertsToApply(definition),
    };
  });
}

/**
 * Mirrors the OAS `where` semantics: matchers describe the context chain, outermost first,
 * and each must pass on an ancestor of its kind (in order) for the subject to be checked.
 * A trailing matcher of the subject's own kind narrows the subject node itself.
 */
function matchesWhere(node: any, ctx: GraphqlUserContext, matchers: WhereMatcher[]): boolean {
  let ancestorMatchers = matchers;

  const last = matchers.at(-1);
  if (last && last.kind === node.kind) {
    if (!passesAsserts(node, last, ctx)) return false;
    ancestorMatchers = matchers.slice(0, -1);
  }

  let ancestorIndex = 0;
  for (const matcher of ancestorMatchers) {
    let matched = false;
    while (ancestorIndex < ctx.ancestors.length) {
      const ancestor = ctx.ancestors[ancestorIndex++];
      if (ancestor.kind === matcher.kind && passesAsserts(ancestor, matcher, ctx)) {
        matched = true;
        break;
      }
    }
    if (!matched) return false;
  }

  return true;
}

function passesAsserts(node: any, matcher: WhereMatcher, ctx: GraphqlUserContext): boolean {
  const value = extractValue(node, matcher.definition.subject.property);
  const baseLocation = new Location(ctx.source, '#/');

  return matcher.assertsToApply.every(
    (assert) =>
      asserts[assert.name](value, assert.conditions, {
        baseLocation,
        rawValue: value,
      } as AssertionFnContext).length === 0
  );
}

function runGraphqlAssertion(
  node: any,
  ctx: GraphqlUserContext,
  assertion: Assertion,
  assertsToApply: AssertToApply[]
): void {
  const property = singleProperty(assertion.subject.property);
  const target = property === undefined ? node : node[property];
  const value = extractValue(node, assertion.subject.property);

  // The shared asserts report against a `Location`; GraphQL reports by node, so the location is unused.
  const baseLocation = new Location(ctx.source, '#/');

  const problems = assertsToApply.flatMap((assert) =>
    asserts[assert.name](value, assert.conditions, {
      baseLocation,
      rawValue: value,
    } as AssertionFnContext)
  );

  if (!problems.length) return;

  // Same default message and placeholders as the OAS `buildSubjectVisitor`;
  // {{pointer}} and {{key}} stay empty — SDL has no JSON pointers or parent keys.
  const defaultMessage =
    `${colorize.blue(assertion.assertionId)} failed because the ${colorize.blue(
      assertion.subject.type
    )} ${colorize.blue(property ?? '')} didn't meet the assertions: {{problems}}`.replace(
      / +/g,
      ' '
    );

  ctx.report({
    message: interpolateMessagePlaceholders(assertion.message ?? defaultMessage, {
      problems: getProblemsMessage(problems),
      assertionName: assertion.assertionId,
      nodeType: assertion.subject.type,
      property: property ?? '',
      key: '',
      pointer: '',
      file: getFilenameFromPath(ctx.source.absoluteRef),
    }),
    node: isAstNode(target) ? target : node,
    suggest: assertion.suggest,
    ruleId: assertion.assertionId,
    // 'off' assertions are skipped above, so the remaining severities are reportable.
    severity: assertion.severity as ProblemSeverity | undefined,
  });
}

function extractValue(node: any, property: Assertion['subject']['property']): unknown {
  const single = singleProperty(property);
  // Mirrors the OAS behavior: without `property`, key asserts run against the node's keys.
  return single === undefined ? nodeKeys(node) : unwrapValue(node[single]);
}

// graphql-js nodes carry `kind`/`loc` bookkeeping and set absent optional fields to undefined; neither counts as a key of the GraphQL construct itself.
function nodeKeys(node: any): string[] {
  return Object.keys(node).filter(
    (key) => key !== 'kind' && key !== 'loc' && node[key] !== undefined
  );
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

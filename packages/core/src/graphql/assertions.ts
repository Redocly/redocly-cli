import { colorize } from '../logger.js';
import { Location } from '../ref-utils.js';
import {
  asserts,
  runOnKeysSet,
  runOnValuesSet,
  type AssertionFnContext,
} from '../rules/common/assertions/asserts.js';
import type { Assertion, AssertionDefinition } from '../rules/common/assertions/index.js';
import {
  getFilenameFromPath,
  getProblemsMessage,
  interpolateMessagePlaceholders,
  type AssertToApply,
} from '../rules/common/assertions/utils.js';
import { isPlainObject } from '../utils/is-plain-object.js';
import { isString } from '../utils/is-string.js';
import { keysOf } from '../utils/keys-of.js';
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

// Duplicates the core of getAssertsToApply from rules/common/assertions/utils.ts.
// Skips the OAS key/value guards, because keys-only asserts like required/disallowed legitimately run against a property here
function getGraphqlAssertsToApply(assertion: AssertionDefinition): AssertToApply[] {
  return keysOf(asserts)
    .filter((assertName) => assertion.assertions[assertName] !== undefined)
    .map((assertName) => ({
      name: assertName,
      conditions: assertion.assertions[assertName],
      runsOnKeys: runOnKeysSet.has(assertName),
      runsOnValues: runOnValuesSet.has(assertName),
    }));
}

export const GraphqlAssertions: GraphqlRule = (
  configurableRulesObject: Record<string, unknown>
): GraphqlVisitor[] => {
  const assertions = Object.values(configurableRulesObject).filter(isPlainObject<Assertion>);
  const visitors: GraphqlVisitor[] = [];

  for (const assertion of assertions) {
    if (assertion.severity === 'off') continue;

    const kind = assertion.subject?.type as GraphqlNodeKind | undefined;
    if (!kind) continue;

    const assertsToApply = getGraphqlAssertsToApply(assertion);
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
      assertsToApply: getGraphqlAssertsToApply(definition),
    };
  });
}

function matchesWhere(node: any, ctx: GraphqlUserContext, matchers: WhereMatcher[]): boolean {
  let ancestorMatchers = matchers;

  // A trailing `where` entry of the subject's own type constrains the node itself, not an ancestor.
  const lastMatcher = matchers.at(-1);
  if (lastMatcher && lastMatcher.kind === node.kind) {
    if (!passesAsserts(node, lastMatcher, ctx)) return false;
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
  const { value } = resolveSubject(node, matcher.definition.subject.property);
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
  const { value, locNode } = resolveSubject(node, assertion.subject.property);

  const baseLocation = new Location(ctx.source, '#/');

  const problems = assertsToApply.flatMap((assert) =>
    asserts[assert.name](value, assert.conditions, {
      baseLocation,
      rawValue: value,
    } as AssertionFnContext)
  );

  if (!problems.length) return;

  // {{pointer}} and {{key}} stay empty - SDL has no JSON pointers or parent keys.
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
    node: locNode,
    suggest: assertion.suggest,
    ruleId: assertion.assertionId,
    severity: assertion.severity as ProblemSeverity | undefined,
  });
}

type ResolvedSubject = { value: unknown; locNode: any };

function unwrapNode(node: any): ResolvedSubject {
  if (node?.name?.value !== undefined) return { value: node.name.value, locNode: node.name };
  if (node?.value !== undefined) return { value: node.value, locNode: node };
  return { value: node, locNode: node };
}

function resolveSubject(node: any, property: Assertion['subject']['property']): ResolvedSubject {
  const propertyName = singleProperty(property);
  if (propertyName === undefined) return unwrapNode(node);

  const target = node[propertyName];
  if (Array.isArray(target)) {
    return { value: target.map((item) => unwrapNode(item).value), locNode: node };
  }

  const resolved = unwrapNode(target);
  // A non-AST property value has no location of its own - report the parent node.
  return { value: resolved.value, locNode: isAstNode(resolved.locNode) ? resolved.locNode : node };
}

function isAstNode(target: unknown): boolean {
  return isPlainObject(target) && 'kind' in target;
}

// GraphQL subjects target a single property. Arrays are accepted only for config-shape parity with OAS; the first entry is used.
function singleProperty(property: Assertion['subject']['property']): string | undefined {
  return Array.isArray(property) ? property[0] : property;
}

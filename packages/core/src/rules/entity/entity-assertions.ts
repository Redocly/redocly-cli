import { buildVisitorObject, getAssertsToApply } from '../common/assertions/utils.js';
import { getEntityProperty, type CatalogEntity } from './property-accessor.js';
import { asserts } from '../common/assertions/asserts.js';
import { colorize } from '../../logger.js';
import { isPlainObject } from '../../utils/is-plain-object.js';

import type { Assertion } from '../common/assertions/index.js';
import type { VisitFunction } from '../../visitors.js';
import type { UserContext } from '../../walk.js';
import type { AssertResult } from '../../config/types.js';
import type { AssertToApply } from '../common/assertions/utils.js';

function runEntityAssertion({
  assert,
  ctx,
  assertionProperty,
  entityNode,
}: {
  assert: AssertToApply;
  ctx: UserContext;
  assertionProperty?: string;
  entityNode: CatalogEntity | unknown;
}): AssertResult[] {
  const currentLocation = assert.name === 'ref' ? ctx.rawLocation : ctx.location;

  const entity = isPlainObject(entityNode) ? (entityNode as CatalogEntity) : null;
  if (!entity) {
    return [];
  }

  if (assertionProperty) {
    const values = getEntityProperty(entity, assertionProperty);
    const rawValues = values;

    const location = currentLocation.child(assertionProperty);

    return asserts[assert.name](values, assert.conditions, {
      ...ctx,
      node: entity,
      rawNode: entity,
      baseLocation: location,
      rawValue: rawValues,
    });
  } else {
    const value = Array.isArray(entity) ? entity : Object.keys(entity);

    return asserts[assert.name](value, assert.conditions, {
      ...ctx,
      node: entity,
      rawNode: entity,
      rawValue: entity,
      baseLocation: currentLocation,
    });
  }
}

function applyEntityAssertions(
  assertion: Assertion,
  asserts: AssertToApply[],
  ctx: UserContext,
  entityNode: CatalogEntity | unknown
): AssertResult[] {
  const properties = Array.isArray(assertion.subject.property)
    ? assertion.subject.property
    : assertion.subject.property
    ? [assertion.subject.property]
    : [];

  const assertResults: Array<AssertResult[]> = [];

  for (const assert of asserts) {
    if (properties.length) {
      for (const property of properties) {
        assertResults.push(
          runEntityAssertion({
            assert,
            ctx,
            assertionProperty: property,
            entityNode,
          })
        );
      }
    } else {
      assertResults.push(
        runEntityAssertion({
          assert,
          ctx,
          entityNode,
        })
      );
    }
  }

  return assertResults.flat();
}

/**
 * Build a visitor for entity assertions
 * Handles entity-specific property access including relation sugar syntax
 *
 * Note: VisitFunction<any> matches the existing visitor system pattern which uses `any` for node types.
 */
export function buildEntitySubjectVisitor(
  assertId: string,
  assertion: Assertion
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): VisitFunction<any> {
  return (node: unknown, ctx: UserContext) => {
    // Get the root entity by walking up the parent chain
    let rootEntity: CatalogEntity | unknown = node;
    let current = ctx.parent;
    while (current) {
      if (current.type?.name === 'Entity') {
        rootEntity = current.activatedOn?.value?.node || rootEntity;
        break;
      }
      current = current.parent;
    }

    if (!rootEntity || rootEntity === node) {
      rootEntity = node;
    }

    const rootEntityObj = isPlainObject(rootEntity) ? (rootEntity as CatalogEntity) : null;
    if (!rootEntityObj) {
      return;
    }

    // Determine entity node based on subject type
    let entityNode: CatalogEntity | unknown = node;
    if (assertion.subject.type === 'Entity') {
      entityNode = rootEntityObj;
    } else if (assertion.subject.type === 'EntityMetadata') {
      const metadata = rootEntityObj.metadata;
      entityNode = isPlainObject(metadata) ? (metadata as CatalogEntity) : node;
    } else if (assertion.subject.type === 'EntityRelations') {
      entityNode = rootEntityObj.relations || node;
    } else if (assertion.subject.type === 'EntityRelation') {
      entityNode = node;
    }

    // Relation sugar syntax (relations.ownedBy) requires root entity
    const property = Array.isArray(assertion.subject.property)
      ? assertion.subject.property[0]
      : assertion.subject.property;
    if (property && typeof property === 'string' && property.startsWith('relations.')) {
      entityNode = rootEntityObj;
    }

    const properties = Array.isArray(assertion.subject.property)
      ? assertion.subject.property
      : assertion.subject.property
      ? [assertion.subject.property]
      : [];

    const defaultMessage = `${colorize.blue(assertId)} failed because the ${colorize.blue(
      assertion.subject.type
    )} ${colorize.blue(properties.join(', ') || 'properties')} didn't meet the assertions`.replace(
      / +/g,
      ' '
    );

    const assertsToApply = getAssertsToApply(assertion);
    const problems = applyEntityAssertions(assertion, assertsToApply, ctx, entityNode);

    if (problems.length) {
      const groups: Record<string, typeof problems> = {};
      for (const problem of problems) {
        if (!problem.location) continue;
        const pointer = problem.location.pointer;
        groups[pointer] = groups[pointer] || [];
        groups[pointer].push(problem);
      }

      for (const problemGroup of Object.values(groups)) {
        const problemMessage =
          problemGroup.length === 1
            ? problemGroup[0].message ?? ''
            : problemGroup.map((p) => `\n- ${p.message ?? ''}`).join('');

        const message = assertion.message || defaultMessage.replace('{{problems}}', problemMessage);

        ctx.report({
          message,
          location: problemGroup[0].location || ctx.location,
          forceSeverity: assertion.severity || 'error',
          suggest: assertion.suggest || [],
          ruleId: assertId,
        });
      }
    }
  };
}

/**
 * Build visitor object for entity assertions
 * Note: Uses `any` types to match the existing visitor system pattern.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildEntityVisitorObject(
  assertion: Assertion,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subjectVisitor: VisitFunction<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const visitor = buildVisitorObject(assertion, subjectVisitor) as Record<string, any>;
  return visitor;
}

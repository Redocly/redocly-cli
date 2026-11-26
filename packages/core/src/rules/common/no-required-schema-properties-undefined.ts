import { isRef, type Location } from '../../ref-utils.js';
import type { OasRef } from '../../typings/openapi.js';
import { isNotEmptyArray } from '../../utils/is-not-empty-array.js';
import { isPlainObject } from '../../utils/is-plain-object.js';
import type { Async2Rule, Async3Rule, Arazzo1Rule, Oas2Rule, Oas3Rule } from '../../visitors.js';
import type { ResolveResult, UserContext } from '../../walk.js';
import { type AnySchema, resolveSchema, schemaHasProperty } from '../utils.js';

export const NoRequiredSchemaPropertiesUndefined:
  | Oas3Rule
  | Oas2Rule
  | Async3Rule
  | Async2Rule
  | Arazzo1Rule = () => {
  const parents: AnySchema[] = [];
  const validatedRefNodes = new Set<unknown>();

  const reportUndefinedRequired = (
    schema: AnySchema,
    schemaLocation: Location,
    ctx: UserContext
  ) => {
    if (!isNotEmptyArray<string>(schema.required)) return;

    for (const [i, requiredProperty] of schema.required.entries()) {
      if (!schemaHasProperty(schema, requiredProperty, ctx, new Set(), schemaLocation)) {
        ctx.report({
          message: `Required property '${requiredProperty}' is not defined.`,
          location: schemaLocation.child(['required', i]),
          reference:
            'https://redocly.com/docs/cli/rules/common/no-required-schema-properties-undefined',
        });
      }
    }
  };

  const isCompositionChild = (parent: AnySchema, child: AnySchema, ctx: UserContext): boolean => {
    const matchesChild = (s: AnySchema) => resolveSchema(s, ctx).schema === child;
    return !!(
      parent.allOf?.some(matchesChild) ||
      parent.anyOf?.some(matchesChild) ||
      parent.oneOf?.some(matchesChild)
    );
  };

  const findCompositionAncestors = (i: number, child: AnySchema, ctx: UserContext): AnySchema[] => {
    if (i < 0) {
      return [];
    }

    const parent = parents[i];

    return isCompositionChild(parent, child, ctx)
      ? [parent, ...findCompositionAncestors(i - 1, parent, ctx)]
      : [];
  };

  const isCompositionUsage = (parent: AnySchema | undefined, ctx: UserContext): boolean =>
    parent !== undefined && [parent.allOf, parent.anyOf, parent.oneOf].includes(ctx.parent);

  const reportUndefinedRequiredInComposition = (
    schema: AnySchema,
    required: string[],
    schemaLocation: Location,
    compositionAncestors: AnySchema[],
    ctx: UserContext,
    from?: Location
  ) => {
    for (const [i, requiredProperty] of required.entries()) {
      if (
        !schemaHasProperty(schema, requiredProperty, ctx, new Set(), schemaLocation) &&
        !compositionAncestors.some((ancestor) => schemaHasProperty(ancestor, requiredProperty, ctx))
      ) {
        ctx.report({
          message: `Required property '${requiredProperty}' is not defined.`,
          location: schemaLocation.child(['required', i]),
          ...(from === undefined ? {} : { from }),
          reference:
            'https://redocly.com/docs/cli/rules/common/no-required-schema-properties-undefined',
        });
      }
    }
  };

  return {
    ref: {
      // the walker enters a referenced schema only once, so its composition ancestors
      // differ per usage; each $ref listed in an allOf, anyOf or oneOf is checked here
      enter(refNode: OasRef, ctx: UserContext, resolved: ResolveResult<AnySchema>) {
        if (
          ctx.type.name !== 'Schema' ||
          resolved.node === undefined ||
          !isNotEmptyArray<string>(resolved.node.required) ||
          !isCompositionUsage(parents.at(-1), ctx)
        ) {
          return;
        }

        reportUndefinedRequiredInComposition(
          resolved.node,
          resolved.node.required,
          resolved.location,
          findCompositionAncestors(parents.length - 1, resolved.node, ctx),
          ctx,
          ctx.location
        );
      },
      leave(refNode: OasRef, ctx: UserContext, resolved: ResolveResult<AnySchema>) {
        if (ctx.type.name !== 'Schema') return;

        // composed $refs are never visited as Schema nodes, so the `required` sibling
        // keywords of the ref itself and of the chain hops are validated here
        const composedSchemas = [
          { node: refNode as unknown, location: ctx.location },
          ...(resolved.chain ?? []),
        ];
        for (const { node, location } of composedSchemas) {
          if (!isPlainObject(node) || validatedRefNodes.has(node)) {
            continue;
          }
          validatedRefNodes.add(node);
          reportUndefinedRequired(node as AnySchema, location, ctx);
        }
      },
    },
    Schema: {
      leave(_: AnySchema) {
        parents.pop();
      },
      enter(currentSchema: AnySchema, ctx: UserContext) {
        parents.push(currentSchema);
        // a $ref listed in an allOf, anyOf or oneOf was already checked in ref.enter
        if (
          !isNotEmptyArray<string>(currentSchema.required) ||
          (isRef(ctx.rawNode) && isCompositionUsage(parents.at(-2), ctx))
        ) {
          return;
        }

        reportUndefinedRequiredInComposition(
          currentSchema,
          currentSchema.required,
          ctx.location,
          findCompositionAncestors(parents.length - 2, currentSchema, ctx),
          ctx
        );
      },
    },
  };
};

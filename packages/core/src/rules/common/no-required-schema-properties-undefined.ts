import { isRef, type Location } from '../../ref-utils.js';
import type { Oas3Schema, Oas3_1Schema, OasRef } from '../../typings/openapi.js';
import type { Oas2Schema } from '../../typings/swagger.js';
import { getOwn } from '../../utils/get-own.js';
import { isNotEmptyArray } from '../../utils/is-not-empty-array.js';
import { isPlainObject } from '../../utils/is-plain-object.js';
import type { Async2Rule, Async3Rule, Arazzo1Rule, Oas2Rule, Oas3Rule } from '../../visitors.js';
import type { ResolveResult, UserContext } from '../../walk.js';
import { resolveSchema } from '../utils.js';

type AnySchema =
  | Oas3Schema
  | Oas3_1Schema
  | (Oas2Schema & { anyOf?: undefined; oneOf?: undefined });

export const NoRequiredSchemaPropertiesUndefined:
  | Oas3Rule
  | Oas2Rule
  | Async3Rule
  | Async2Rule
  | Arazzo1Rule = () => {
  const parents: AnySchema[] = [];
  const validatedChainHops = new Set<unknown>();

  const definesProperty = (
    schema: AnySchema,
    propertyName: string,
    visited: Set<AnySchema>,
    ctx: UserContext,
    resolveFrom?: string
  ): boolean => {
    if (schema.properties && getOwn(schema.properties, propertyName) !== undefined) {
      return true;
    }

    if (schema.allOf?.some((s) => hasProperty(s, propertyName, visited, ctx, resolveFrom))) {
      return true;
    }

    if (
      isNotEmptyArray<AnySchema>(schema.anyOf) &&
      schema.anyOf.every((s) => hasProperty(s, propertyName, new Set(visited), ctx, resolveFrom))
    ) {
      return true;
    }

    if (
      isNotEmptyArray<AnySchema>(schema.oneOf) &&
      schema.oneOf.every((s) => hasProperty(s, propertyName, new Set(visited), ctx, resolveFrom))
    ) {
      return true;
    }

    return false;
  };

  const hasProperty = (
    schemaOrRef: AnySchema | undefined,
    propertyName: string,
    visited: Set<AnySchema>,
    ctx: UserContext,
    resolveFrom?: string
  ): boolean => {
    // A JSON Schema 2020-12 $ref can carry sibling keywords that compose the target,
    // so check them before the $ref is resolved away.
    if (
      isRef(schemaOrRef) &&
      definesProperty(schemaOrRef as AnySchema, propertyName, visited, ctx, resolveFrom)
    ) {
      return true;
    }

    const { schema, location, chain } = resolveSchema(schemaOrRef, ctx, resolveFrom);
    if (!schema || visited.has(schema)) return false;
    visited.add(schema);

    if (definesProperty(schema, propertyName, visited, ctx, location)) {
      return true;
    }

    // composed $refs the resolution chased through contribute their sibling keywords too
    for (const chainHop of chain ?? []) {
      if (
        isPlainObject(chainHop.node) &&
        definesProperty(
          chainHop.node as AnySchema,
          propertyName,
          visited,
          ctx,
          chainHop.location.source.absoluteRef
        )
      ) {
        return true;
      }
    }

    return false;
  };

  const reportUndefinedRequired = (
    schema: AnySchema,
    schemaLocation: Location,
    ctx: UserContext,
    resolveFrom?: string
  ) => {
    if (!schema.required) return;

    for (const [i, requiredProperty] of schema.required.entries()) {
      if (!hasProperty(schema, requiredProperty, new Set(), ctx, resolveFrom)) {
        ctx.report({
          message: `Required property '${requiredProperty}' is not defined.`,
          location: schemaLocation.child(['required', i]),
          reference:
            'https://redocly.com/docs/cli/rules/common/no-required-schema-properties-undefined',
        });
      }
    }
  };

  return {
    ref: {
      leave(_ref: OasRef, ctx: UserContext, resolved: ResolveResult<AnySchema>) {
        // composed $refs in the chain are never visited as Schema nodes, so their
        // `required` sibling keywords are validated here
        for (const chainHop of resolved.chain ?? []) {
          if (!isPlainObject(chainHop.node) || validatedChainHops.has(chainHop.node)) {
            continue;
          }
          validatedChainHops.add(chainHop.node);
          reportUndefinedRequired(
            chainHop.node as AnySchema,
            chainHop.location,
            ctx,
            chainHop.location.source.absoluteRef
          );
        }
      },
    },
    Schema: {
      leave(_: AnySchema) {
        parents.pop();
      },
      enter(currentSchema: AnySchema, ctx: UserContext) {
        parents.push(currentSchema);
        if (!currentSchema.required) return;

        const isCompositionChild = (parent: AnySchema, child: AnySchema): boolean => {
          const matchesChild = (s: AnySchema) => resolveSchema(s, ctx).schema === child;
          return !!(
            parent.allOf?.some(matchesChild) ||
            parent.anyOf?.some(matchesChild) ||
            parent.oneOf?.some(matchesChild)
          );
        };

        const findCompositionRoot = (i: number, child: AnySchema): AnySchema | undefined => {
          if (i < 0) return undefined;
          const parent = parents[i];
          return isCompositionChild(parent, child)
            ? (findCompositionRoot(i - 1, parent) ?? parent)
            : undefined;
        };

        const compositionRoot = findCompositionRoot(parents.length - 2, currentSchema);

        for (const [i, requiredProperty] of currentSchema.required.entries()) {
          if (
            !hasProperty(currentSchema, requiredProperty, new Set(), ctx) &&
            !hasProperty(compositionRoot, requiredProperty, new Set(), ctx)
          ) {
            ctx.report({
              message: `Required property '${requiredProperty}' is not defined.`,
              location: ctx.location.child(['required', i]),
              reference:
                'https://redocly.com/docs/cli/rules/common/no-required-schema-properties-undefined',
            });
          }
        }
      },
    },
  };
};

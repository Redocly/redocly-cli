import { type Location } from '../../ref-utils.js';
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

  return {
    ref: {
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
        if (!isNotEmptyArray<string>(currentSchema.required)) return;

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
            !schemaHasProperty(currentSchema, requiredProperty, ctx) &&
            !schemaHasProperty(compositionRoot, requiredProperty, ctx)
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

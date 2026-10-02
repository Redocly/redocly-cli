import { type Location } from '../../ref-utils.js';
import type { OasRef } from '../../typings/openapi.js';
import { getOwn } from '../../utils/get-own.js';
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
        const propertyContainerSchema = compositionRoot ?? currentSchema;

        const hasPropertyInParentContext = (
          propertyName: string,
          targetSchema: AnySchema
        ): boolean => {
          for (let i = parents.length - 2; i >= 0; i--) {
            const ancestor = parents[i];
            const props = ancestor.properties as Record<string, AnySchema> | undefined;
            if (!props) continue;

            const propertyKey = (Object.keys(props) as string[]).find((key) => {
              const schema = getOwn(props, key) as AnySchema;
              if (schema === targetSchema) return true;
              return resolveSchema(schema, ctx).schema === targetSchema;
            });
            if (!propertyKey) continue;

            const checkSiblings = (siblings: AnySchema[] | undefined): boolean =>
              !!siblings?.some((sibling) => {
                const { schema: siblingSchema, location } = resolveSchema(sibling, ctx);
                if (!siblingSchema?.properties) return false;
                const propertyDef = getOwn(
                  siblingSchema.properties as Record<string, AnySchema>,
                  propertyKey
                ) as AnySchema | undefined;
                return (
                  propertyDef !== undefined &&
                  schemaHasProperty(propertyDef, propertyName, ctx, new Set(), location)
                );
              });

            if (
              checkSiblings(ancestor.allOf) ||
              checkSiblings(ancestor.anyOf) ||
              checkSiblings(ancestor.oneOf)
            ) {
              return true;
            }
          }

          return false;
        };

        for (const [i, requiredProperty] of currentSchema.required.entries()) {
          if (
            !schemaHasProperty(currentSchema, requiredProperty, ctx, new Set(), ctx.location) &&
            !schemaHasProperty(compositionRoot, requiredProperty, ctx, new Set(), ctx.location) &&
            !hasPropertyInParentContext(requiredProperty, propertyContainerSchema)
          ) {
            ctx.report({
              message: `Required property '${requiredProperty}' is undefined.`,
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

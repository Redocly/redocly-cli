import type { Async2Rule, Async3Rule, Arazzo1Rule, Oas2Rule, Oas3Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';
import { type AnySchema, resolveSchema, schemaHasProperty } from '../utils.js';

export const NoRequiredSchemaPropertiesUndefined:
  | Oas3Rule
  | Oas2Rule
  | Async3Rule
  | Async2Rule
  | Arazzo1Rule = () => {
  const parents: AnySchema[] = [];
  return {
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

import type { Oas3_1Schema, Oas3Schema } from '../../typings/openapi.js';
import { type Oas3Rule } from '../../visitors.js';
import { type UserContext } from '../../walk.js';
import { resolveSchema } from '../utils.js';

export const SpecDiscriminatorDefaultMapping: Oas3Rule = () => {
  let componentsSchemaNames: string[] = [];

  return {
    Root: {
      enter(root) {
        // Starting from the Root to ensure it runs before other visitors that might use componentsSchemaNames.
        componentsSchemaNames = Object.keys(root.components?.schemas || {});
      },
    },

    Schema: {
      leave(schema, ctx: UserContext) {
        const discriminatedPropertyName = schema.discriminator?.propertyName;
        if (!discriminatedPropertyName) return;

        const defaultMapping = schema.discriminator?.defaultMapping;

        if (defaultMapping === undefined) {
          const visited = new Set<Oas3Schema | Oas3_1Schema>();

          const isDiscriminatorPropertyRequired = (
            schemaOrRef: Oas3Schema | Oas3_1Schema | undefined,
            resolveFrom?: string
          ): boolean => {
            const resolved = resolveSchema(schemaOrRef, ctx, resolveFrom);
            if (!resolved.schema || visited.has(resolved.schema)) {
              return true;
            }
            visited.add(resolved.schema);
            if (
              resolved.schema.required?.includes(discriminatedPropertyName) ||
              resolved.schema.allOf?.some((s) =>
                isDiscriminatorPropertyRequired(s, resolved.location)
              ) ||
              resolved.schema.oneOf?.every((s) =>
                isDiscriminatorPropertyRequired(s, resolved.location)
              ) ||
              resolved.schema.anyOf?.every((s) =>
                isDiscriminatorPropertyRequired(s, resolved.location)
              )
            ) {
              return true;
            }
            return false;
          };

          if (!isDiscriminatorPropertyRequired(schema)) {
            ctx.report({
              message: `Discriminator with optional property '${discriminatedPropertyName}' must include a defaultMapping field.`,
              location: ctx.location.child('discriminator'),
            });
          }
        } else {
          if (
            ctx.resolve({ $ref: defaultMapping }).node === undefined &&
            !componentsSchemaNames.includes(defaultMapping)
          ) {
            ctx.report({
              message: `defaultMapping value '${defaultMapping}' does not point to an existing schema component.`,
              location: ctx.location.child(['discriminator', 'defaultMapping']),
            });
          }
        }
      },
    },
  };
};

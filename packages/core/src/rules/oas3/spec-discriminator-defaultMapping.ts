import { isRef } from '../../ref-utils.js';
import type { Oas3_1Schema, Oas3Schema, Referenced } from '../../typings/openapi.js';
import { type Oas3Rule } from '../../visitors.js';
import { type NonUndefined, type UserContext } from '../../walk.js';

const resolveSchema = <T extends NonUndefined>(
  schemaOrRef: Referenced<T> | undefined,
  ctx: UserContext
) => (isRef(schemaOrRef) ? ctx.resolve<T>(schemaOrRef).node : schemaOrRef);

export const SpecDiscriminatorDefaultMapping: Oas3Rule = () => {
  let componentsSchemaNames: string[];

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
          const isPropertyRequired = (
            schemaOrRef: Oas3Schema | Oas3_1Schema | undefined
          ): boolean => {
            const s = resolveSchema(schemaOrRef, ctx);

            if (!s) return false;
            if (s.required?.includes(discriminatedPropertyName)) return true;
            if (s.allOf?.some(isPropertyRequired)) return true;
            if (s.oneOf?.every(isPropertyRequired)) return true;
            if (s.anyOf?.every(isPropertyRequired)) return true;
            return false;
          };

          if (!isPropertyRequired(schema)) {
            ctx.report({
              message: `Discriminator with optional property '${discriminatedPropertyName}' must include a defaultMapping field.`,
              location: ctx.location.child('discriminator'),
            });
          }
        } else {
          const isInComponentsSchemas = componentsSchemaNames.includes(defaultMapping);
          const pointsToExistingComponent = ctx.resolve({ $ref: defaultMapping }).node;

          if (!isInComponentsSchemas && !pointsToExistingComponent) {
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

import type { Oas3Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

export const SpecDiscriminatorDefaultMapping: Oas3Rule = () => {
  let componentsSchemaNames: string[];

  return {
    NamedSchemas: {
      enter(schemas) {
        componentsSchemaNames = Object.keys(schemas);
      },
    },
    Schema: {
      leave(schema, ctx: UserContext) {
        if (!schema.discriminator?.propertyName) return;

        const defaultMapping = schema.discriminator.defaultMapping;
        const isPropertyOptional = !schema.required?.includes(schema.discriminator.propertyName);
        if (isPropertyOptional && defaultMapping === undefined) {
          ctx.report({
            message: `Discriminator with optional property '${schema.discriminator.propertyName}' must include a defaultMapping field.`,
            location: ctx.location.child('discriminator'),
          });
          return;
        }

        if (defaultMapping !== undefined && !componentsSchemaNames.includes(defaultMapping)) {
          ctx.report({
            message: `defaultMapping value '${defaultMapping}' does not point to an existing schema component.`,
            location: ctx.location.child(['discriminator', 'defaultMapping']),
          });
        }
      },
    },
  };
};

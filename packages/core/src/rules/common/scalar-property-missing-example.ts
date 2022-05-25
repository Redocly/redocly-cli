import { Oas2Rule, Oas3Rule } from '../../visitors';
import { Oas2Schema } from '../../typings/swagger';
import { Oas3Schema, Oas3_1Schema } from '../../typings/openapi';
import { UserContext } from '../../walk';
import { OasVersion } from 'core/src/oas-types';

const SCALAR_TYPES = ['string', 'integer', 'number', 'boolean', 'null'];

export const ScalarPropertyMissingExample: Oas3Rule | Oas2Rule = () => {
  return {
    SchemaProperties(
      properties: { [name: string]: Oas2Schema | Oas3Schema | Oas3_1Schema },
      { report, location, oasVersion, resolve }: UserContext,
    ) {
      for (const propName of Object.keys(properties)) {
        const propSchema = resolve(properties[propName]).node;

        if (!propSchema || !isScalarSchema(propSchema)) {
          continue;
        }

        if (!propSchema.example && !(propSchema as Oas3_1Schema).examples) {
          report({
            message: `Scalar property should have "example"${
              oasVersion === OasVersion.Version3_1 ? ' or "examples"' : ''
            } defined.`,
            location: location.child(propName).key(),
          });
        }
      }
    },
  };
};

function isScalarSchema(schema: Oas2Schema | Oas3Schema | Oas3_1Schema) {
  if (!schema.type) {
    return false;
  }

  if (schema.allOf || (schema as Oas3Schema).anyOf || (schema as Oas3Schema).oneOf) {
    // Skip allOf/oneOf/anyOf as it's complicated to validate it right now.
    // We need core support for checking contrstrains through those keywords.
    return false;
  }

  if (schema.format === 'binary') {
    return false;
  }

  if (Array.isArray(schema.type)) {
    return schema.type.every((t) => SCALAR_TYPES.includes(t));
  }

  return SCALAR_TYPES.includes(schema.type);
}

import { isRef } from '../../ref-utils.js';
import type { Oas3Schema, Oas3_1Schema } from '../../typings/openapi.js';
import type { Oas3Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';
import { missingRequiredField, schemaHasProperty, validateDefinedAndNonEmpty } from '../utils.js';

const reference = 'https://redocly.com/docs/cli/rules/oas/operation-4xx-problem-details-rfc7807';

/**
 * Validation according to rfc7807 - https://datatracker.ietf.org/doc/html/rfc7807
 */
export const Operation4xxProblemDetailsRfc7807: Oas3Rule = () => {
  return {
    Response: {
      skip(_, key: string | number) {
        return !/4[Xx0-9]{2}/.test(`${key}`);
      },
      enter(response, { report, location }: UserContext) {
        if (!response.content || !response.content['application/problem+json'])
          report({
            message: 'Response `4xx` must have content-type `application/problem+json`.',
            location: location.key(),
            reference,
          });
      },
      MediaType: {
        skip(_, key: string | number) {
          return key !== 'application/problem+json';
        },
        enter(media, ctx: UserContext) {
          validateDefinedAndNonEmpty({ fieldName: 'schema', value: media, ctx, reference });

          if (!media.schema) return;

          const { node: schema, location: schemaLocation } = isRef(media.schema)
            ? ctx.resolve<Oas3Schema | Oas3_1Schema>(media.schema)
            : { node: media.schema, location: ctx.location.child('schema') };
          if (!schema || !schemaLocation) return;

          for (const fieldName of ['type', 'title']) {
            if (!schemaHasProperty(media.schema, fieldName, ctx)) {
              ctx.report({
                message: missingRequiredField('SchemaProperties', fieldName),
                location: schema.properties
                  ? schemaLocation.child(['properties', fieldName]).key()
                  : schemaLocation.key(),
                reference,
              });
            }
          }
        },
      },
    },
  };
};

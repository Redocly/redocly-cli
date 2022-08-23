import { Oas3MediaType, Oas3Response, Oas3Schema } from 'core/src/typings/openapi';
import { Oas3Rule } from '../../visitors';
import { UserContext } from '../../walk';
import { validateDefinedAndNonEmpty } from '../utils';

/**
 * Validation according rfc7807 - https://datatracker.ietf.org/doc/html/rfc7807
 */
export const Operation4xxProblemDetailsRfc7807: Oas3Rule = () => {
  return {
    Response: {
      skip(_response: Oas3Response, key: string | number) {
        return !/4[Xx0-9]{2}/.test(`${key}`);
      },
      enter(response: Oas3Response, { report, location }: UserContext) {
        if (!response.content || !response.content['application/problem+json'])
          report({
            message: 'Response `4xx` must have content-type `application/problem+json`.',
            location: location.key(),
          });
      },
      MediaType: {
        skip(_response: Oas3MediaType, key: string | number) {
          return key !== 'application/problem+json';
        },
        enter(media: Oas3MediaType, ctx: UserContext) {
          validateDefinedAndNonEmpty('schema', media, ctx);
        },
        SchemaProperties(schema: Oas3Schema, ctx: UserContext) {
          validateDefinedAndNonEmpty('type', schema, ctx);
          validateDefinedAndNonEmpty('title', schema, ctx);
        },
      },
    },
  };
};

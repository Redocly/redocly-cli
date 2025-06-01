import { validateDefinedAndNonEmpty } from '../utils.js';

import type { Oas3Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';
import { Oas3Response, Oas3_1Schema, Oas3_2Response } from 'core/src/typings/openapi.js';

/**
 * Validation according to rfc7807 - https://datatracker.ietf.org/doc/html/rfc7807
 */
export const Operation4xxProblemDetailsRfc7807: Oas3Rule = () => {
  return {
    Response: {
      skip(_, key: string | number) {
        return !/4[Xx0-9]{2}/.test(`${key}`);
      },
      enter(response: Oas3Response | Oas3_2Response, { report, location }: UserContext) {
        if (!response.content || !response.content['application/problem+json'])
          report({
            message: 'Response `4xx` must have content-type `application/problem+json`.',
            location: location.key(),
          });
      },
      MediaType: {
        skip(_, key: string | number) {
          return key !== 'application/problem+json';
        },
        enter(media, ctx: UserContext) {
          validateDefinedAndNonEmpty('schema', media, ctx);
        },
        SchemaProperties(schema, ctx: UserContext) {
          validateDefinedAndNonEmpty('type', schema, ctx);
          validateDefinedAndNonEmpty('title', schema, ctx);
        },
      },
    },
  };
};

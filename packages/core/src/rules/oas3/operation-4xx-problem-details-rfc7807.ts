import { Oas3Response, Oas3Schema } from 'core/src/typings/openapi';
import { Oas3Rule } from '../../visitors';
import { UserContext } from '../../walk';
import { validateDefinedAndNonEmpty } from '../utils';

/**
 * Validation according rfc7807 - https://datatracker.ietf.org/doc/html/rfc7807
 */
export const Operation4xxProblemDetailsRfc7807: Oas3Rule = () => {
  return {
    ResponsesMap(responses: Record<string, object>, { report, location }: UserContext) {
      const codes = Object.keys(responses);
      for (const code of codes) {
        if (!/4[Xx0-9]{2}/.test(code)) continue;
        const response = responses[code] as Oas3Response;
        if (!response.content || !response.content['application/problem+json']) {
          report({
            message: 'Response `4xx` must have content type `application/problem+json`.',
            location: location.child(code).key(),
          });
        }
      }
    },
    Response: {
      skip(response: Oas3Response) {
        if (!response.content || !response.content['application/problem+json']) {
          return true;
        }
        return false;
      },
      SchemaProperties(schema: Oas3Schema, ctx: UserContext) {
        validateDefinedAndNonEmpty('type', schema, ctx);
        validateDefinedAndNonEmpty('title', schema, ctx);
      },
    },
  };
};

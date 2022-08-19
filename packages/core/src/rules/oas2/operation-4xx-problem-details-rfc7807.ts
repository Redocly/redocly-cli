import { Oas2Response, Oas2Schema } from 'core/src/typings/swagger';
import { Oas2Rule } from '../../visitors';
import { UserContext } from '../../walk';
import { validateDefinedAndNonEmpty } from '../utils';

/**
 * Validation according rfc7807 - https://datatracker.ietf.org/doc/html/rfc7807
 */
export const Operation4xxProblemDetailsRfc7807: Oas2Rule = () => {
  return {
    Response: {
      skip(_: Oas2Response, key: string | number) {
        return !/4[Xx0-9]{2}/.test(`${key}`);
      },
      SchemaProperties(schema: Oas2Schema, ctx: UserContext) {
        validateDefinedAndNonEmpty('type', schema, ctx);
        validateDefinedAndNonEmpty('title', schema, ctx);
      },
    },
  };
};

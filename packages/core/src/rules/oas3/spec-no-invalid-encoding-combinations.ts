import { type Oas3Rule } from '../../visitors.js';
import { type UserContext } from '../../walk.js';

export const SpecNoInvalidEncodingCombinations: Oas3Rule = () => {
  return {
    MediaType: {
      leave(mediaType, ctx: UserContext) {
        if (
          ('prefixEncoding' in mediaType && 'encoding' in mediaType) ||
          ('itemEncoding' in mediaType && 'encoding' in mediaType)
        ) {
          ctx.report({
            message:
              "The 'encoding' field cannot be used together with 'prefixEncoding' or 'itemEncoding'.",
            location: ctx.location.child('encoding').key(),
          });
        }
      },
    },
  };
};

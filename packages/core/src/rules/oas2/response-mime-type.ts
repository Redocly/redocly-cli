import { validateMimeType } from '../../utils/validate-mime-type.js';
import type { Oas2Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

export const ResponseMimeType: Oas2Rule = ({ allowedValues }) => {
  return {
    Root(root, ctx: UserContext) {
      validateMimeType({ type: 'produces', value: root }, ctx, allowedValues);
    },
    Operation: {
      leave(operation, ctx: UserContext) {
        validateMimeType({ type: 'produces', value: operation }, ctx, allowedValues);
      },
    },
  };
};

import { validateMimeTypeOAS2 } from '../../utils/validate-mime-type.js';
import type { Oas2Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

export const RequestMimeType: Oas2Rule = ({ allowedValues }) => {
  return {
    Root(root, ctx: UserContext) {
      validateMimeTypeOAS2({
        type: 'consumes',
        value: root,
        ctx,
        allowedValues,
        reference: 'https://redocly.com/docs/cli/rules/oas/request-mime-type',
      });
    },
    Operation: {
      leave(operation, ctx: UserContext) {
        validateMimeTypeOAS2({
          type: 'consumes',
          value: operation,
          ctx,
          allowedValues,
          reference: 'https://redocly.com/docs/cli/rules/oas/request-mime-type',
        });
      },
    },
  };
};

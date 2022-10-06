import { Oas2Rule } from '../../visitors';
import { UserContext } from '../../walk';
import { Oas2Definition, Oas2Operation } from '../../typings/swagger';
import { validateMimeType } from '../../utils';

export const RequestMimeType: Oas2Rule = ({ allowedValues }) => {
  return {
    Root(root: Oas2Definition, ctx: UserContext) {
      validateMimeType({ type: 'consumes', value: root }, ctx, allowedValues);
    },
    Operation: {
      leave(operation: Oas2Operation, ctx: UserContext) {
        validateMimeType({ type: 'consumes', value: operation }, ctx, allowedValues);
      },
    },
  };
};

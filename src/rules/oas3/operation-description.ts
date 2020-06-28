import { Oas3Rule } from '../../visitors';
import { validateDefinedAndNonEmpty } from '../utils';

export const OperationDescription: Oas3Rule = () => {
  return {
    Operation(operation, ctx) {
      validateDefinedAndNonEmpty('description', operation, ctx);
    },
  };
};

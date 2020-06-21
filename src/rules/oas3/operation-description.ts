import { Oas3Rule } from '../../visitors';
import { missingRequiredField } from '../utils';

export const OperationDescription: Oas3Rule = () => {
  return {
    Operation(operation, { report }) {
      if (!operation.description) {
        report({
          message: missingRequiredField('Operation', 'description'),
          location: { reportOnKey: true },
        });
      }
    },
  };
};

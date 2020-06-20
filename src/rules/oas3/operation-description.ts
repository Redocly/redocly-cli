import { OAS3Rule } from '../../visitors';
import { missingRequiredField } from '../utils';

export const OperationDescription: OAS3Rule = () => {
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

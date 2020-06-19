import { OAS3Rule } from '../../visitors';
import { missingRequiredField } from '../utils';

export const OperationSingularTag: OAS3Rule = () => {
  return {
    Operation(operation, { report, location }) {
      if (operation.tags && operation.tags.length > 1) {
        report({
          message: 'Operation "tags" object should have only one tag.',
          location: { ...location.append(['tags']), reportOnKey: true },
        });
      }
    },
  };
};

import { Oas3Rule } from '../../visitors';

export const OperationSingularTag: Oas3Rule = () => {
  return {
    Operation(operation, { report, location }) {
      if (operation.tags && operation.tags.length > 1) {
        report({
          message: 'Operation "tags" object should have only one tag.',
          location: location.child(['tags']).key(),
        });
      }
    },
  };
};

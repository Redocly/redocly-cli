import { Oas3Rule } from '../../visitors';

export const OperationIdUnique: Oas3Rule = () => {
  const seenOperations = new Set();

  return {
    Operation(operation, { report, location }) {
      if (!operation.operationId) return;
      if (seenOperations.has(operation.operationId)) {
        report({
          message: 'Every operation must have a unique `operationId`',
          location: location.child([operation.operationId]),
        });
      }
      seenOperations.add(operation.operationId);
    },
  };
};

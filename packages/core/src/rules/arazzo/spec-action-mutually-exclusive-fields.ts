import type { OnFailureObject, OnSuccessObject } from '../../typings/arazzo.js';
import type { Arazzo1Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

export const SpecActionMutuallyExclusiveFields: Arazzo1Rule = () => {
  function reportBothTargets(
    action: OnSuccessObject | OnFailureObject,
    { report, location }: UserContext
  ) {
    if (Object.hasOwn(action, 'stepId') && Object.hasOwn(action, 'workflowId')) {
      report({
        message:
          'An action can only use one of the following mutually exclusive fields: `stepId`, `workflowId`.',
        location: [location.child(['stepId']).key(), location.child(['workflowId']).key()],
        reference:
          'https://redocly.com/docs/cli/rules/arazzo/spec-action-mutually-exclusive-fields',
      });
    }
  }

  return {
    SuccessActionObject: { enter: reportBothTargets },
    FailureActionObject: { enter: reportBothTargets },
  };
};

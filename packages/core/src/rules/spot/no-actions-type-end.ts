import type { ArazzoRule } from '../../visitors';
import type { UserContext } from '../../walk';

export const NoActionsTypeEnd: ArazzoRule = () => {
  return {
    FailureActionObject: {
      enter(action, { report, location }: UserContext) {
        if (action.type === 'end') {
          report({
            message: 'The `end` type action is not supported by Spot.',
            location: location.child(['type']),
          });
        }
      },
    },
    SuccessActionObject: {
      enter(action, { report, location }: UserContext) {
        if (action.type === 'end') {
          report({
            message: 'The `end` type action is not supported by Spot.',
            location: location.child(['type']),
          });
        }
      },
    },
  };
};

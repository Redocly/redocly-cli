import type { ArazzoRule } from '../../visitors';
import type { UserContext } from '../../walk';

export const ParametersNoBodyInsideIn: ArazzoRule = () => {
  return {
    ParameterObject: {
      enter(parameter, { report, location }: UserContext) {
        if (parameter.in === 'body') {
          report({
            message: 'Parameters `in` property not allowed to have `body` value.',
            location: location.child(['in']),
          });
        }
      },
    },
  };
};

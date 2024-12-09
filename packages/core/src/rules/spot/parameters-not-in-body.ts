import type { Arazzo1Rule } from '../../visitors';
import type { UserContext } from '../../walk';

export const ParametersNotInBody: Arazzo1Rule = () => {
  return {
    Parameter: {
      enter(parameter, { report, location }: UserContext) {
        if (parameter.in === 'body') {
          report({
            message: 'The `body` value of the `in` property is not supported by Spot.',
            location: location.child(['in']),
          });
        }
      },
    },
  };
};

import type { Parameter } from '../../typings/arazzo.js';
import type { Arazzo1Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

export const ParametersUnique: Arazzo1Rule = () => {
  function checkParametersUnique(parameters: Parameter[], { report, location }: UserContext) {
    if (!parameters) return;
    const seenParameters = new Set();

    for (const parameter of parameters) {
      if (seenParameters.has(parameter?.name)) {
        report({
          message: 'The parameter `name` must be unique amongst listed parameters.',
          location: location.child([parameters.indexOf(parameter)]),
        });
      }

      if (seenParameters.has(parameter?.reference)) {
        report({
          message: 'The parameter `reference` must be unique amongst listed parameters.',
          location: location.child([parameters.indexOf(parameter)]),
        });
      }

      seenParameters.add(parameter?.name ?? parameter?.reference);
    }
  }

  return {
    Parameters: { enter: checkParametersUnique },
    // success and failure action parameters, added in Arazzo 1.1
    ActionParameters: { enter: checkParametersUnique },
  };
};

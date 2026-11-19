import type { ArazzoDefinition, Parameter, Step } from '../../typings/arazzo.js';
import { isPlainObject } from '../../utils/is-plain-object.js';
import type { Arazzo1Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

export const SpecStepParametersInRequired: Arazzo1Rule = () => {
  let reusableParameters: Record<string, Parameter> = {};

  return {
    Root: {
      enter(root: ArazzoDefinition) {
        reusableParameters = isPlainObject(root.components?.parameters)
          ? root.components.parameters
          : {};
      },
    },
    Step: {
      enter(step: Step, { report, location }: UserContext) {
        // the parameters of a step that runs a workflow are the inputs of that workflow
        if (step.workflowId !== undefined || !Array.isArray(step.parameters)) {
          return;
        }

        step.parameters.forEach((stepParameter, index) => {
          // A reusable object points to a parameter with `$components.parameters.<name>`.
          // The struct rule reports parameters of a wrong type, so this rule only has to skip them.
          const parameter =
            typeof stepParameter?.reference === 'string'
              ? reusableParameters[stepParameter.reference.replace('$components.parameters.', '')]
              : stepParameter;

          if (isPlainObject(parameter) && parameter.in === undefined) {
            report({
              message:
                'A step parameter must define the `in` field, unless the step uses `workflowId`.',
              location: location.child(['parameters', index]),
              reference:
                'https://redocly.com/docs/cli/rules/arazzo/spec-step-parameters-in-required',
            });
          }
        });
      },
    },
  };
};

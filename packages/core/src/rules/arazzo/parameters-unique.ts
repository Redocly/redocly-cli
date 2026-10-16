import type { Parameter } from '../../typings/arazzo.js';
import type { Arazzo1Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

export const ParametersUnique: Arazzo1Rule = () => {
  // the component parameters by the reference that points to them
  const componentParameters = new Map<string, Parameter | undefined>();

  return {
    Root(root, { resolve }: UserContext) {
      for (const [name, parameter] of Object.entries(root.components?.parameters ?? {})) {
        componentParameters.set(`$components.parameters.${name}`, resolve(parameter).node);
      }
    },
    Parameters: {
      enter(parameters, { report, location, resolve }: UserContext) {
        if (!parameters) return;
        const seenParameters = new Set<string>();

        for (const [index, item] of parameters.entries()) {
          const parameter = resolve(item).node;
          // a reference counts as the component parameter it points to
          const referencedParameter = parameter?.reference
            ? componentParameters.get(parameter.reference)
            : undefined;
          const resolvedParameter = referencedParameter ?? parameter;
          // a unique parameter is defined by the combination of its `name` and `in`
          const parameterKey =
            resolvedParameter?.name === undefined
              ? parameter?.reference
              : `${resolvedParameter.name}:${resolvedParameter.in}`;

          if (parameterKey === undefined) continue;

          if (seenParameters.has(parameterKey)) {
            report({
              message:
                resolvedParameter?.name === undefined
                  ? 'The parameter `reference` must be unique amongst listed parameters.'
                  : 'The parameter `name` must be unique amongst listed parameters.',
              location: location.child([index]),
            });
          }

          seenParameters.add(parameterKey);
        }
      },
    },
  };
};

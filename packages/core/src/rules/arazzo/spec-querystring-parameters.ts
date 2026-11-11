import type { ArazzoDefinition, Parameter, Step, Workflow } from '../../typings/arazzo.js';
import type { Arazzo1Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

const reference = 'https://redocly.com/docs/cli/rules/arazzo/spec-querystring-parameters';

export const SpecQuerystringParameters: Arazzo1Rule = () => {
  let reusableParameters: Record<string, Parameter> = {};
  let workflowParameters: Parameter[] = [];

  // a reusable object points to a parameter with `$components.parameters.<name>`
  function resolveParameters(parameters: Parameter[] = []): Parameter[] {
    return parameters.map((parameter) =>
      parameter.reference
        ? (reusableParameters[parameter.reference.replace('$components.parameters.', '')] ??
          parameter)
        : parameter
    );
  }

  function checkParameters(
    inheritedParameters: Parameter[],
    parameters: Parameter[],
    { report, location }: UserContext
  ) {
    let hasQuery = inheritedParameters.some((parameter) => parameter.in === 'query');
    let hasQuerystring = inheritedParameters.some((parameter) => parameter.in === 'querystring');

    parameters.forEach((parameter, index) => {
      const parameterLocation = location.child(['parameters', index]);

      if (parameter.in === 'querystring') {
        if (hasQuerystring) {
          report({
            message:
              'Parameters with `in: querystring` should be defined only once per step, including the parameters of its workflow.',
            location: parameterLocation,
            reference,
          });
        }
        if (hasQuery) {
          report({
            message:
              'Parameters with `in: querystring` cannot be used together with `in: query` in the same step, including the parameters of its workflow.',
            location: parameterLocation,
            reference,
          });
        }
        hasQuerystring = true;
      }

      if (parameter.in === 'query') {
        if (hasQuerystring) {
          report({
            message:
              'Parameters with `in: query` cannot be used together with `in: querystring` in the same step, including the parameters of its workflow.',
            location: parameterLocation,
            reference,
          });
        }
        hasQuery = true;
      }
    });
  }

  return {
    Root: {
      enter(root: ArazzoDefinition) {
        reusableParameters = root.components?.parameters ?? {};
      },
    },
    Workflow: {
      enter(workflow: Workflow, ctx: UserContext) {
        workflowParameters = resolveParameters(workflow.parameters);
        checkParameters([], workflowParameters, ctx);
      },
    },
    Step: {
      enter(step: Step, ctx: UserContext) {
        // the parameters of a step that runs a workflow are the inputs of that workflow
        if (step.workflowId) {
          return;
        }

        const stepParameters = resolveParameters(step.parameters);
        // a step parameter replaces the workflow parameter with the same `name` and `in`
        const inheritedParameters = workflowParameters.filter(
          (workflowParameter) =>
            !stepParameters.some(
              (stepParameter) =>
                stepParameter.name === workflowParameter.name &&
                stepParameter.in === workflowParameter.in
            )
        );

        checkParameters(inheritedParameters, stepParameters, ctx);
      },
    },
  };
};

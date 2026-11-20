import type { Parameter } from '../../typings/arazzo.js';
import { isPlainObject } from '../../utils/is-plain-object.js';
import type { Arazzo1Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';
import { resolveArazzoParameters } from '../utils.js';

export const SpecStepParametersInRequired: Arazzo1Rule = () => {
  let reusableParameters: Record<string, Parameter> | undefined;

  function checkParameters(
    parameters: Parameter[] | undefined,
    message: string,
    { report, location }: UserContext
  ) {
    resolveArazzoParameters(parameters, reusableParameters).forEach((parameter, index) => {
      if (isPlainObject(parameter) && parameter.in === undefined) {
        report({
          message,
          location: location.child(['parameters', index]),
          reference: 'https://redocly.com/docs/cli/rules/arazzo/spec-step-parameters-in-required',
        });
      }
    });
  }

  return {
    Root(root) {
      reusableParameters = root.components?.parameters;
    },
    Workflow(workflow, ctx) {
      // a workflow parameter applies to every step, and only a step that runs a workflow takes it as an input
      if (
        !Array.isArray(workflow.steps) ||
        workflow.steps.every((step) => step?.workflowId !== undefined)
      ) {
        return;
      }

      checkParameters(
        workflow.parameters,
        'A workflow parameter must define the `in` field, unless all steps of the workflow use `workflowId`.',
        ctx
      );
    },
    Step(step, ctx) {
      // the parameters of a step that runs a workflow are the inputs of that workflow
      if (step.workflowId !== undefined) {
        return;
      }

      checkParameters(
        step.parameters,
        'A step parameter must define the `in` field, unless the step uses `workflowId`.',
        ctx
      );
    },
  };
};

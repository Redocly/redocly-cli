import type { Workflow } from '../../typings/arazzo.js';
import type { Arazzo1Rule } from '../../visitors.js';

// A step of another workflow of the same description
const WORKFLOW_STEP_REFERENCE = /^\$workflows\.([^.]+)\.steps\.([^.]+)$/;

export const SpecStepDependsOnDefined: Arazzo1Rule = () => {
  let definedWorkflows: Workflow[] = [];
  let currentWorkflow: Workflow | undefined;

  // A workflow or a step can have a wrong type: this rule also runs on a description that `struct` rejects.
  function hasStep(workflow: Workflow | undefined, stepId: string) {
    const steps = workflow?.steps;
    return Array.isArray(steps) && steps.some((step) => step?.stepId === stepId);
  }

  return {
    Workflows(workflows) {
      definedWorkflows = workflows;
    },
    Workflow(workflow) {
      currentWorkflow = workflow;
    },
    Step(step, { report, location }) {
      if (!Array.isArray(step?.dependsOn)) return;

      for (const [index, dependency] of step.dependsOn.entries()) {
        if (typeof dependency !== 'string') continue;
        // The `spec-sourceDescriptions-defined` rule checks the name of the source description,
        // and the steps of another Arazzo document are not loaded.
        if (dependency.startsWith('$sourceDescriptions.')) continue;

        const reportUndefined = (message: string) =>
          report({
            message,
            location: location.child(['dependsOn', index]),
            reference: 'https://redocly.com/docs/cli/rules/arazzo/spec-step-dependson-defined',
          });

        const workflowStepReference = dependency.match(WORKFLOW_STEP_REFERENCE);
        if (!workflowStepReference) {
          if (!hasStep(currentWorkflow, dependency)) {
            reportUndefined(`The step \`${dependency}\` is not defined in the current workflow.`);
          }
          continue;
        }

        const [, workflowId, stepId] = workflowStepReference;
        const referencedWorkflow = definedWorkflows.find(
          (workflow) => workflow?.workflowId === workflowId
        );
        if (!referencedWorkflow) {
          reportUndefined(`The workflow \`${workflowId}\` is not defined in \`workflows\`.`);
        } else if (!hasStep(referencedWorkflow, stepId)) {
          reportUndefined(
            `The step \`${stepId}\` is not defined in the workflow \`${workflowId}\`.`
          );
        }
      }
    },
  };
};

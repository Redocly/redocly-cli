import type { Workflow } from '../../typings/arazzo.js';
import type { Arazzo1Rule } from '../../visitors.js';

// A step of another workflow of the same description.
// An id can contain dots: the specification only recommends `[A-Za-z0-9_\-]+` for it.
const WORKFLOW_STEP_REFERENCE = /^\$workflows\.(.+?)\.steps\.(.+)$/;
// A step of a workflow of another Arazzo document
const SOURCE_DESCRIPTION_STEP_REFERENCE = /^\$sourceDescriptions\..+\..+\.steps\..+$/;

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
        if (typeof dependency !== 'string' || hasStep(currentWorkflow, dependency)) continue;
        // The `spec-sourceDescriptions-defined` rule checks the name of the source description,
        // and the steps of another Arazzo document are not loaded.
        if (SOURCE_DESCRIPTION_STEP_REFERENCE.test(dependency)) continue;

        const reportUndefined = (message: string) =>
          report({
            message,
            location: location.child(['dependsOn', index]),
            reference: 'https://redocly.com/docs/cli/rules/arazzo/spec-step-dependson-defined',
          });

        const workflowStepReference = dependency.match(WORKFLOW_STEP_REFERENCE);
        if (workflowStepReference) {
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
        } else if (dependency.startsWith('$')) {
          reportUndefined(
            `The value \`${dependency}\` must be a \`stepId\` of the current workflow, or have the form \`$workflows.<workflowId>.steps.<stepId>\` or \`$sourceDescriptions.<name>.<workflowId>.steps.<stepId>\`.`
          );
        } else {
          reportUndefined(`The step \`${dependency}\` is not defined in the current workflow.`);
        }
      }
    },
  };
};

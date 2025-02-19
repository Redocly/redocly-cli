import type { TestDescription, Workflow, Step } from '../../types';

// Scraps-out sensitive information from a test case
export function cleanupTestDescription(testDescription: TestDescription) {
  const { workflows, arazzo, sourceDescriptions } = testDescription;
  const workflowsCleaned = [] as Workflow[];

  workflows?.map((workflow) => {
    workflowsCleaned.push(cleanupWorkflow(workflow));
  });

  return {
    arazzo,
    sourceDescriptions,
    workflows: workflowsCleaned,
  };
}

function cleanupWorkflow(workflow: Workflow): any {
  const { workflowId, steps } = workflow;
  return {
    workflowId,
    steps: steps?.map(cleanupStep),
  };
}

function cleanupStep(step: Step): any {
  const { stepId, parameters, successCriteria } = step;
  return { stepId, successCriteria, parameters: parameters?.map(({ value: _, ...rest }) => rest) };
}

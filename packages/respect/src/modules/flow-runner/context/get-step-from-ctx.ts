import type { TestContext, Step, Workflow } from '../../../types';

export function getStepFromCtx(
  ctx: TestContext,
  workflowInput: string | Workflow,
  stepId: string,
): Step {
  const workflowId = typeof workflowInput === 'string' ? workflowInput : workflowInput.workflowId;
  const workflow = ctx.workflows.find((w) => w.workflowId === workflowId);
  if (!workflow) {
    throw new Error(`Workflow "${workflowId}" not found in context`);
  }

  const step = workflow.steps.find((s: Step) => s.stepId === stepId);
  if (!step) {
    throw new Error(`Step "${stepId}" not found in workflow "${workflowId}"`);
  }

  return step;
}

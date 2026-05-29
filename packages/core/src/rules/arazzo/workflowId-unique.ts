import type { Arazzo1Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

export const WorkflowIdUnique: Arazzo1Rule = () => {
  const seenWorkflow = new Set();

  return {
    Workflow: {
      enter(workflow, { report, location }: UserContext) {
        if (!workflow.workflowId) return;
        if (seenWorkflow.has(workflow.workflowId)) {
          report({
            message: 'Every workflow must have a unique `workflowId`.',
            location: location.child([workflow.workflowId]),
            reference: 'https://redocly.com/docs/cli/rules/arazzo/workflowid-unique',
          });
        }
        seenWorkflow.add(workflow.workflowId);
      },
    },
  };
};

import type { ArazzoRule } from '../../visitors';
import type { UserContext } from '../../walk';

export const WorkflowDependsOnUnique: ArazzoRule = () => {
  const seenWorkflow = new Set();

  return {
    Workflow(workflow, { report, location }: UserContext) {
      if (!workflow.dependsOn) return;

      for (const item of workflow.dependsOn) {
        if (seenWorkflow.has(item)) {
          report({
            message: 'Every workflow in dependsOn must be unique.',
            location: location.child([`dependsOn`]),
          });
        }
        seenWorkflow.add(item);
      }
    },
  };
};

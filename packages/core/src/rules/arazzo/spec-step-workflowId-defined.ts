import type { Arazzo1Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

export const SpecStepWorkflowIdDefined: Arazzo1Rule = () => {
  const workflowIds = new Set<string>();
  const sourceDescriptionTypes = new Map<string, string>();

  return {
    SourceDescriptions(sourceDescriptions) {
      for (const sourceDescription of sourceDescriptions) {
        sourceDescriptionTypes.set(sourceDescription?.name, sourceDescription?.type);
      }
    },
    Workflows(workflows) {
      for (const workflow of workflows) {
        workflowIds.add(workflow?.workflowId);
      }
    },
    Step(step, { report, location }: UserContext) {
      const stepWorkflowId = step.workflowId;
      if (typeof stepWorkflowId !== 'string') return;

      const reportUndefined = (message: string) =>
        report({
          message,
          location: location.child(['workflowId']),
          reference: 'https://redocly.com/docs/cli/rules/arazzo/spec-step-workflowid-defined',
        });

      // A workflow of another Arazzo document: $sourceDescriptions.<name>.<workflowId>
      if (stepWorkflowId.startsWith('$sourceDescriptions.')) {
        const sourceName = stepWorkflowId.split('.')[1];

        if (!sourceDescriptionTypes.has(sourceName)) {
          reportUndefined(
            `The source description \`${sourceName}\` is not defined in \`sourceDescriptions\`.`
          );
        } else if (sourceDescriptionTypes.get(sourceName) !== 'arazzo') {
          reportUndefined(
            `The source description \`${sourceName}\` must have the \`arazzo\` type to contain workflows.`
          );
        }
        return;
      }

      if (!workflowIds.has(stepWorkflowId)) {
        reportUndefined(`The workflow \`${stepWorkflowId}\` is not defined in \`workflows\`.`);
      }
    },
  };
};

import type { Arazzo1Rule } from '../../visitors.js';

export const SpecStepWorkflowIdDefined: Arazzo1Rule = () => {
  const workflowIds = new Set<string>();
  const nonArazzoSourceNames = new Set<string>();

  return {
    SourceDescriptions(sourceDescriptions) {
      for (const sourceDescription of sourceDescriptions) {
        if (sourceDescription?.type !== 'arazzo') {
          nonArazzoSourceNames.add(sourceDescription?.name);
        }
      }
    },
    Workflows(workflows) {
      for (const workflow of workflows) {
        workflowIds.add(workflow?.workflowId);
      }
    },
    Step(step, { report, location }) {
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
        const [, sourceName, workflowId] = stepWorkflowId.split('.');

        if (!sourceName || !workflowId) {
          reportUndefined(
            `The reference \`${stepWorkflowId}\` must have the form \`$sourceDescriptions.<name>.<workflowId>\`.`
          );
        } else if (nonArazzoSourceNames.has(sourceName)) {
          // The `spec-sourceDescriptions-defined` rule reports a source description that is not defined.
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

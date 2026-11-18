import type { OnFailureObject, OnSuccessObject } from '../../typings/arazzo.js';
import type { Arazzo1Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

export const SpecActionWorkflowIdDefined: Arazzo1Rule = () => {
  const workflowIds = new Set<string>();
  const sourceDescriptionTypes = new Map<string, string>();

  function checkWorkflowId(
    action: OnSuccessObject | OnFailureObject,
    { report, location }: UserContext
  ) {
    const actionWorkflowId = action.workflowId;
    // the `workflowId` of an `end` action is not relevant, so it references nothing
    if (action.type === 'end' || typeof actionWorkflowId !== 'string') return;

    const reportUndefined = (message: string) =>
      report({
        message,
        location: location.child(['workflowId']),
        reference: 'https://redocly.com/docs/cli/rules/arazzo/spec-action-workflowid-defined',
      });

    // A workflow of another Arazzo document: $sourceDescriptions.<name>.<workflowId>
    if (actionWorkflowId.startsWith('$sourceDescriptions.')) {
      const [, sourceDescriptionName, sourceWorkflowId] = actionWorkflowId.split('.');
      // The `spec-sourceDescriptions-defined` rule reports a name that is not defined.
      const sourceDescriptionType = sourceDescriptionTypes.get(sourceDescriptionName);

      if (!sourceDescriptionName || !sourceWorkflowId) {
        reportUndefined(
          `The \`workflowId\` \`${actionWorkflowId}\` must have the \`$sourceDescriptions.<name>.<workflowId>\` form.`
        );
      } else if (sourceDescriptionType !== undefined && sourceDescriptionType !== 'arazzo') {
        reportUndefined(
          `The source description \`${sourceDescriptionName}\` must have the \`arazzo\` type to contain workflows.`
        );
      }
      return;
    }

    if (!workflowIds.has(actionWorkflowId)) {
      reportUndefined(`The workflow \`${actionWorkflowId}\` is not defined in \`workflows\`.`);
    }
  }

  return {
    SourceDescriptions(sourceDescriptions) {
      for (const sourceDescription of sourceDescriptions) {
        // The `sourceDescription-type` rule reports a missing `type`.
        if (typeof sourceDescription?.type === 'string') {
          sourceDescriptionTypes.set(sourceDescription.name, sourceDescription.type);
        }
      }
    },
    Workflows(workflows) {
      for (const workflow of workflows) {
        workflowIds.add(workflow?.workflowId);
      }
    },
    SuccessActionObject: { enter: checkWorkflowId },
    FailureActionObject: { enter: checkWorkflowId },
  };
};

import type { OnFailureObject, OnSuccessObject } from '../../typings/arazzo.js';
import type { Arazzo1Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

// The name in `$sourceDescriptions.<name>.<reference>` and in `{$sourceDescriptions.<name>.url}#/paths/...`
const SOURCE_DESCRIPTION_REFERENCE = /\$sourceDescriptions\.([^.}#]+)/;

// The `spec-step-operationId-resolved` rule checks `operationId`.
const STEP_REFERENCE_FIELDS = [
  'operationPath',
  'channelPath', // added in Arazzo 1.1
  'workflowId',
] as const;

export const SpecSourceDescriptionsDefined: Arazzo1Rule = () => {
  const sourceDescriptionNames = new Set<string>();

  // The value can have a wrong type: this rule also runs on a description that `struct` rejects.
  function checkReference(
    value: unknown,
    { report, location }: UserContext,
    path: Array<string | number>
  ) {
    if (typeof value !== 'string') return;

    const sourceDescriptionName = value.match(SOURCE_DESCRIPTION_REFERENCE)?.[1];
    if (sourceDescriptionName && !sourceDescriptionNames.has(sourceDescriptionName)) {
      report({
        message: `Source description \`${sourceDescriptionName}\` is not defined in \`sourceDescriptions\`.`,
        location: location.child(path),
        reference: 'https://redocly.com/docs/cli/rules/arazzo/spec-sourcedescriptions-defined',
      });
    }
  }

  function checkActionWorkflowId(action: OnSuccessObject | OnFailureObject, ctx: UserContext) {
    // the `workflowId` of an `end` action is not relevant, so it references nothing
    if (action.type === 'end') return;

    checkReference(action.workflowId, ctx, ['workflowId']);
  }

  return {
    SourceDescriptions(sourceDescriptions) {
      for (const sourceDescription of sourceDescriptions) {
        const name = sourceDescription?.name;
        if (typeof name === 'string') sourceDescriptionNames.add(name);
      }
    },
    Step(step, ctx) {
      for (const field of STEP_REFERENCE_FIELDS) {
        checkReference(step[field], ctx, [field]);
      }

      // added in Arazzo 1.1
      if (Array.isArray(step.dependsOn)) {
        for (const [index, dependency] of step.dependsOn.entries()) {
          checkReference(dependency, ctx, ['dependsOn', index]);
        }
      }
    },
    SuccessActionObject: checkActionWorkflowId,
    FailureActionObject: checkActionWorkflowId,
  };
};

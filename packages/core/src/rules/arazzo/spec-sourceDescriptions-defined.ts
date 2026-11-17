import type {
  OnFailureObject,
  OnSuccessObject,
  SourceDescription,
  Step,
} from '../../typings/arazzo.js';
import type { Arazzo1Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

// The name in `$sourceDescriptions.<name>.<reference>` and in `{$sourceDescriptions.<name>.url}#/paths/...`
const SOURCE_DESCRIPTION_REFERENCE = /\$sourceDescriptions\.([^.}#]+)/;

const STEP_REFERENCE_FIELDS = [
  'operationId',
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

  return {
    SourceDescriptions: {
      enter(sourceDescriptions: SourceDescription[]) {
        for (const sourceDescription of sourceDescriptions) {
          sourceDescriptionNames.add(sourceDescription.name);
        }
      },
    },
    Step: {
      enter(step: Step, ctx: UserContext) {
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
    },
    SuccessActionObject: {
      enter(action: OnSuccessObject, ctx: UserContext) {
        checkReference(action.workflowId, ctx, ['workflowId']);
      },
    },
    FailureActionObject: {
      enter(action: OnFailureObject, ctx: UserContext) {
        checkReference(action.workflowId, ctx, ['workflowId']);
      },
    },
  };
};

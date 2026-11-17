import type { Location } from '../../ref-utils.js';
import type {
  ArazzoDefinition,
  OnFailureObject,
  OnSuccessObject,
  Workflow,
} from '../../typings/arazzo.js';
import { isPlainObject } from '../../utils/is-plain-object.js';
import type { Arazzo1Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

type Action = OnSuccessObject | OnFailureObject;

export const SpecActionStepIdDefined: Arazzo1Rule = () => {
  const reusableActions = new Map<string, Action>();
  let workflowStepIds = new Set<string>();

  function checkStepId(
    action: Action | undefined,
    location: Location,
    report: UserContext['report']
  ) {
    // the `stepId` of an `end` action is not relevant, so it references nothing
    if (
      action?.type === 'end' ||
      typeof action?.stepId !== 'string' ||
      workflowStepIds.has(action.stepId)
    ) {
      return;
    }

    report({
      message: `The \`stepId\` "${action.stepId}" must reference a step defined in the current workflow.`,
      location,
      reference: 'https://redocly.com/docs/cli/rules/arazzo/spec-action-stepid-defined',
    });
  }

  return {
    Root: {
      enter(root: ArazzoDefinition) {
        // A reusable object points to an action with `$components.<successActions|failureActions>.<name>`.
        for (const componentName of ['successActions', 'failureActions'] as const) {
          const actions = root.components?.[componentName];
          if (!isPlainObject<Record<string, Action>>(actions)) continue;

          for (const [actionName, action] of Object.entries(actions)) {
            reusableActions.set(`$components.${componentName}.${actionName}`, action);
          }
        }
      },
    },
    Workflow: {
      enter(workflow: Workflow) {
        workflowStepIds = new Set(
          Array.isArray(workflow.steps) ? workflow.steps.map((step) => step?.stepId) : []
        );
      },
      SuccessActionObject(action: OnSuccessObject, { report, location }: UserContext) {
        checkStepId(action, location.child(['stepId']), report);
      },
      FailureActionObject(action: OnFailureObject, { report, location }: UserContext) {
        checkStepId(action, location.child(['stepId']), report);
      },
      // The step is checked where the action is used: the same action can be valid in one workflow and not in another.
      ReusableObject(reusableObject: { reference: string }, { report, location }: UserContext) {
        checkStepId(
          reusableActions.get(reusableObject.reference),
          location.child(['reference']),
          report
        );
      },
    },
  };
};

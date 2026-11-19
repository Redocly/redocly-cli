import type { Location } from '../../ref-utils.js';
import type { OnFailureObject, OnSuccessObject, Step } from '../../typings/arazzo.js';
import type { Arazzo1Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

type Action = OnSuccessObject | OnFailureObject;

export const SpecActionStepIdDefined: Arazzo1Rule = () => {
  const reusableActions = new Map<string, Action>();
  // An action is checked when the walk ends: the later steps of its workflow and the components are not visited yet.
  const deferredChecks: Array<() => void> = [];
  let workflowStepIds = new Set<string>();

  function deferCheck(
    findAction: () => Action | undefined,
    location: Location,
    report: UserContext['report']
  ) {
    const stepIds = workflowStepIds;

    deferredChecks.push(() => {
      const action = findAction();
      // the `stepId` of an `end` action is not relevant, so it references nothing
      if (
        action?.type === 'end' ||
        typeof action?.stepId !== 'string' ||
        stepIds.has(action.stepId)
      ) {
        return;
      }

      report({
        message: `The \`stepId\` "${action.stepId}" must reference a step defined in the current workflow.`,
        location,
        reference: 'https://redocly.com/docs/cli/rules/arazzo/spec-action-stepid-defined',
      });
    });
  }

  return {
    // A reusable object points to an action with `$components.<successActions|failureActions>.<name>`.
    NamedSuccessActions: {
      SuccessActionObject(action: OnSuccessObject, { key }: UserContext) {
        reusableActions.set(`$components.successActions.${key}`, action);
      },
    },
    NamedFailureActions: {
      FailureActionObject(action: OnFailureObject, { key }: UserContext) {
        reusableActions.set(`$components.failureActions.${key}`, action);
      },
    },
    Workflow: {
      enter() {
        workflowStepIds = new Set();
      },
      Step(step: Step) {
        workflowStepIds.add(step.stepId);
      },
      // The walker enters a list that two workflows share again only when a visitor visits it.
      OnSuccessActionList() {},
      OnFailureActionList() {},
      SuccessActionObject(action: OnSuccessObject, { report, location }: UserContext) {
        deferCheck(() => action, location.child(['stepId']), report);
      },
      FailureActionObject(action: OnFailureObject, { report, location }: UserContext) {
        deferCheck(() => action, location.child(['stepId']), report);
      },
      // The step is checked where the action is used: the same action can be valid in one workflow and not in another.
      ReusableObject(reusableObject: { reference: string }, { report, location }: UserContext) {
        deferCheck(
          () => reusableActions.get(reusableObject.reference),
          location.child(['reference']),
          report
        );
      },
    },
    Root: {
      leave() {
        for (const check of deferredChecks) {
          check();
        }
      },
    },
  };
};

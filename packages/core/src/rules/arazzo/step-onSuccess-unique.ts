import type { ArazzoRule } from '../../visitors';
import type { UserContext } from '../../walk';

export const StepOnSuccessUnique: ArazzoRule = () => {
  return {
    OnSuccessActionList: {
      enter(onSuccessActionList, { report, location }: UserContext) {
        if (!onSuccessActionList) return;
        const seenSuccessActions = new Set();

        for (const onSuccessAction of onSuccessActionList) {
          if (seenSuccessActions.has(onSuccessAction?.name)) {
            report({
              message: 'The action `name` must be unique amongst listed `onSuccess` actions.',
              location: location.child([onSuccessActionList.indexOf(onSuccessAction)]),
            });
          }

          if (seenSuccessActions.has(onSuccessAction?.reference)) {
            report({
              message: 'The action `reference` must be unique amongst listed `onSuccess` actions.',
              location: location.child([onSuccessActionList.indexOf(onSuccessAction)]),
            });
          }

          onSuccessAction?.name
            ? seenSuccessActions.add(onSuccessAction.name)
            : seenSuccessActions.add(onSuccessAction.reference);
        }
      },
    },
  };
};

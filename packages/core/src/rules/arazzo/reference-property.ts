import { isValidURL } from '../../utils';

import type { Arazzo1Rule } from '../../visitors';
import type { UserContext } from '../../walk';

export const ReferenceProperty: Arazzo1Rule = () => {
  return {
    Step: {
      enter(step, { report, location }: UserContext) {
        const successCriteria = step.successCriteria;

        if (successCriteria) {
          successCriteria.forEach((criteria) => {
            const reference = criteria.reference;
            if (reference !== undefined) {
              if (!isValidURL(reference)) {
                report({
                  message: 'The `reference` property must be a valid URI.',
                  location: location.child([
                    step.stepId,
                    'successCriteria',
                    successCriteria.indexOf(criteria),
                  ]),
                });
              }
            }
          });
        }
      },
    },
  };
};

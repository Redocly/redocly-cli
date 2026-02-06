import { isPlainObject } from '../../utils/is-plain-object.js';

import type { Arazzo1Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

export const NoCriteriaXpath: Arazzo1Rule = () => {
  return {
    CriterionObject: {
      enter(criteria, { report, location }: UserContext) {
        if (!criteria.type) {
          return;
        }
        if (
          criteria.type === 'xpath' ||
          (isPlainObject(criteria.type) && criteria.type.type === 'xpath')
        ) {
          report({
            message: 'The `xpath` type criteria is not supported by Respect.',
            location: location.child(['type']),
          });
        }
      },
    },
  };
};

import { ARAZZO_VERSIONS_SUPPORTED_BY_SPOT } from '../../typings/arazzo';

import type { ArazzoRule } from '../../visitors';
import type { UserContext } from '../../walk';

export const ArazzoVersionEnum: ArazzoRule = () => {
  const ALOOWED_ARAZZO_VERSIONS_STRING = ARAZZO_VERSIONS_SUPPORTED_BY_SPOT.join(', ');
  return {
    Root: {
      enter(root, { report, location }: UserContext) {
        if (!ARAZZO_VERSIONS_SUPPORTED_BY_SPOT.includes(root.arazzo)) {
          report({
            message: `Only ${ALOOWED_ARAZZO_VERSIONS_STRING} Arazzo version ${ARAZZO_VERSIONS_SUPPORTED_BY_SPOT.length > 1 ? 'are' : 'is'} supported by Spot.`,
            location: location.child('arazzo'),
          });
        }
      },
    },
  };
};

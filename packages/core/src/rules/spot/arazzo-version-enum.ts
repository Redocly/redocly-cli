import { ARAZZO_VERSIONS_SUPPORTED_BY_SPOT } from '../../typings/arazzo';

import type { ArazzoRule } from '../../visitors';
import type { UserContext } from '../../walk';

export const ArazzoVersionEnum: ArazzoRule = () => {
  return {
    Root: {
      enter(root, { report, location }: UserContext) {
        if (!ARAZZO_VERSIONS_SUPPORTED_BY_SPOT.includes(root.arazzo)) {
          report({
            message: 'Only `1.0.0` Arazzo version is supported by Spot.',
            location: location.child('arazzo'),
          });
        }
      },
    },
  };
};

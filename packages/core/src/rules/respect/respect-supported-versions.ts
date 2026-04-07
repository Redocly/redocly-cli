import { ARAZZO_VERSIONS_SUPPORTED_BY_RESPECT } from '../../typings/arazzo.js';
import { pluralize } from '../../utils/pluralize.js';
import type { Arazzo1Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

export const RespectSupportedVersions: Arazzo1Rule = () => {
  const supportedVersions = ARAZZO_VERSIONS_SUPPORTED_BY_RESPECT.join(', ');
  return {
    Root: {
      enter(root, { report, location }: UserContext) {
        if (!ARAZZO_VERSIONS_SUPPORTED_BY_RESPECT.includes(root.arazzo)) {
          report({
            message: `Only ${supportedVersions} Arazzo ${pluralize(
              'version is',
              ARAZZO_VERSIONS_SUPPORTED_BY_RESPECT.length
            )} fully supported by Respect.`,
            location: location.child('arazzo'),
          });
        }
      },
    },
  };
};

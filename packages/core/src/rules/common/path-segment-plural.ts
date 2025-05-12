import pluralize from 'pluralize';
import { isPathParameter } from '../../utils.js';

import type { Oas3Rule, Oas2Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

export const PathSegmentPlural: Oas3Rule | Oas2Rule = (opts) => {
  const { ignoreLastPathSegment, exceptions } = opts;
  return {
    PathItem: {
      leave(_path: any, { report, key, location }: UserContext) {
        const pathKey = key.toString();
        if (pathKey.startsWith('/')) {
          const pathSegments = pathKey.split('/');
          pathSegments.shift();
          if (ignoreLastPathSegment && pathSegments.length > 0) {
            pathSegments.pop();
          }

          for (const pathSegment of pathSegments) {
            if (exceptions && exceptions.includes(pathSegment)) continue;
            if (!isPathParameter(pathSegment) && pluralize.isSingular(pathSegment)) {
              report({
                message: `path segment \`${pathSegment}\` should be plural.`,
                location: location.key(),
              });
            }
          }
        }
      },
    },
  };
};

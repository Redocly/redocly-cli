import { Oas3Rule, Oas2Rule } from '../../visitors';
import { UserContext } from '../../walk';
import { isSingular } from '../../utils';

export const PathSegmentPlural: Oas3Rule | Oas2Rule = (opts) => {
  const { ignoreLastPathSegment, exceptions } = opts;
  return {
    PathItem: {
      leave(_path: any, { report, key, location }: UserContext) {
        const pathKey = key.toString();
        if (pathKey.startsWith('/')) {
          const pathParts = pathKey.split('/');
          pathParts.shift();
          if (ignoreLastPathSegment && pathParts.length > 1) { pathParts.pop(); }

          for (const pathPart of pathParts) {
            const isExceptions = exceptions && exceptions.includes(pathPart);
            if (!isExceptions && !pathPart.match(/[^{]+(?=\})/g) && isSingular(pathPart)) {
              report({
                message: `path part: \`${pathPart}\` should be plural.`,
                location: location.key(),
              });
            }
          }
        }
      }
    }
  };
};

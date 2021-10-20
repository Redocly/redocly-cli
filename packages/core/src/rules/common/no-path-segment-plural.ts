import { Oas3Rule, Oas2Rule } from '../../visitors';
import { UserContext } from '../../walk';
import { isPathPlural } from '../../utils';

export const NoPathSegmentPlural: Oas3Rule | Oas2Rule = () => {
  return {
    PathItem: {
      leave(_path: any, { report, key, location }: UserContext) {
        const pathKey = key.toString();
        if (pathKey.startsWith('/')) {
          const [,path] = pathKey.split('/');
          if (isPathPlural(path)) {
            report({
              message: `path: \`/${path}\` should not be plural.`,
              location: location.key(),
            });
          }
        }
      }
    }
  };
};

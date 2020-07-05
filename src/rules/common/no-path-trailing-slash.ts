import { Oas3Rule, Oas2Rule } from '../../visitors';
import { UserContext } from '../../walk';

export const NoPathTrailingSlash: Oas3Rule | Oas2Rule = () => {
  return {
    PathItem(_path: any, { report, key }: UserContext) {
      if ((key as string).endsWith('/')) {
        report({
          message: `${key} has a trailing slash.`,
        });
      }
    },
  };
};

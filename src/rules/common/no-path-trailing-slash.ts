import { Oas3Rule, Oas2Rule } from '../../visitors';
import { UserContext } from '../../walk';

export const NoPathTrailingSlash: Oas3Rule | Oas2Rule = () => {
  return {
    PathItem(_path: any, { report, key, location }: UserContext) {
      if ((key as string).endsWith('/') && (key as string).length !== 1) {
        report({
          message: `\`${key}\` should not have a trailing slash.`,
          location: location.key(),
        });
      }
    },
  };
};

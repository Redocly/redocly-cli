import type { Oas3Rule, Oas2Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

export const NoPathTrailingSlash: Oas3Rule | Oas2Rule = () => {
  return {
    PathItem(_path: any, { report, key, rawLocation }: UserContext) {
      if ((key as string).endsWith('/') && key !== '/') {
        report({
          message: `\`${key}\` should not have a trailing slash.`,
          location: rawLocation.key(),
        });
      }
    },
  };
};

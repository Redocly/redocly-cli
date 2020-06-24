import { Oas3Rule } from '../../visitors';

export const NoPathTrailingSlash: Oas3Rule = () => {
  return {
    PathItem(_path, { report, key }) {
      if ((key as string).endsWith('/')) {
        report({
          message: `${key} has a trailing slash.`,
        });
      }
    },
  };
};

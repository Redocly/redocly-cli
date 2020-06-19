import { OAS3Rule } from '../../visitors';

export const PathNoTrailingSlash: OAS3Rule = () => {
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

import { Oas3Rule } from '../../visitors';

export const PathsKebabCase: Oas3Rule = () => {
  return {
    PathItem(_path, { report, key }) {
      const segments = (key as string).substr(1).split('/');
      if (!segments.every((segment) => /^{.+}$/.test(segment) || /^[a-z0-9-_.]+$/.test(segment))) {
        report({
          message: `${key} is not kebab-case`,
          location: { reportOnKey: true },
        });
      }
    },
  };
};

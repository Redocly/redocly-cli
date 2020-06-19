import { OAS3Rule } from '../../visitors';

export const PathDeclarationMustExist: OAS3Rule = () => {
  return {
    PathItem(_path, { report, key }) {
      if ((key as string).indexOf('{}') !== -1) {
        report({
          message: 'Path parameter declarations must be non-empty. {} is invalid.',
          location: { reportOnKey: true },
        });
      }
    },
  };
};

import type { Oas3Rule, Oas2Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

export const PathDeclarationMustExist: Oas3Rule | Oas2Rule = () => {
  return {
    PathItem(_path: object, { report, key }: UserContext) {
      if ((key as string).indexOf('{}') !== -1) {
        report({
          message: 'Path parameter declarations must be non-empty. `{}` is invalid.',
          location: { reportOnKey: true },
        });
      }
    },
  };
};

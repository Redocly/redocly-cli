import { OAS3Rule } from '../../visitors';
import { missingRequiredField } from '../utils';

export const PathNotIncludeQuery: OAS3Rule = () => {
  return {
    PathItem(operation, { report, location, key }) {
      if (key.toString().includes('?')) {
        report({
          message: `Don't put query string items in the path, they belong in parameters with in: query.`,
          location: { reportOnKey: true },
        });
      }
    },
  };
};

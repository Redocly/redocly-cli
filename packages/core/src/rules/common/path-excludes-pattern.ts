import { Oas3Rule, Oas2Rule } from '../../visitors';
import { Oas2PathItem } from '../../typings/swagger';
import { Oas3PathItem } from '../../typings/openapi';
import { UserContext } from '../../walk';

const httpMethods = ['get', 'head', 'post', 'put', 'patch', 'delete', 'options', 'trace'];

export const PathExcludesPattern: Oas3Rule | Oas2Rule = () => {
  return {
    PathItem(_path: Oas2PathItem | Oas3PathItem, { report, key, location }: UserContext) {
      const pathKey = key.toString();
      if (pathKey.startsWith('/')) {
        const urlParts = pathKey.split('/');
        for (const urlPart of urlParts) {
          if (urlPart && !urlPart.match(/[^{]+(?=\})/g)) {
            const startdWIthMethod = httpMethods.filter(
              method => urlPart.toLocaleLowerCase().startsWith(method)
            );
            if (startdWIthMethod.length) {
              report({
                message: `path: \`${key}\` not allow starts with ${startdWIthMethod[0]}`,
                location: location.key(),
              });
            }
          }
        }
      }
    },
  };
};

import { isPathParameter } from '../../utils/is-path-parameter.js';
import { splitCamelCaseIntoWords } from '../../utils/split-camel-case-into-words.js';

import type { Oas3Rule, Oas2Rule } from '../../visitors.js';
import type { Oas2PathItem } from '../../typings/swagger.js';
import type { Oas3PathItem } from '../../typings/openapi.js';
import type { UserContext } from '../../walk.js';

const httpMethods = ['get', 'head', 'post', 'put', 'patch', 'delete', 'options', 'trace'];

export const NoHttpVerbsInPaths: Oas3Rule | Oas2Rule = ({ splitIntoWords }) => {
  return {
    PathItem(_path: Oas2PathItem | Oas3PathItem, { key, report, location }: UserContext) {
      const pathKey = key.toString();
      if (!pathKey.startsWith('/')) return;
      const pathSegments = pathKey.split('/');

      for (const pathSegment of pathSegments) {
        if (!pathSegment || isPathParameter(pathSegment)) continue;

        const isHttpMethodIncluded = (method: string) => {
          return splitIntoWords
            ? splitCamelCaseIntoWords(pathSegment).has(method)
            : pathSegment.toLocaleLowerCase().includes(method);
        };

        for (const method of httpMethods) {
          if (isHttpMethodIncluded(method)) {
            report({
              message: `path \`${pathKey}\` should not contain http verb ${method}`,
              location: location.key(),
            });
          }
        }
      }
    },
  };
};

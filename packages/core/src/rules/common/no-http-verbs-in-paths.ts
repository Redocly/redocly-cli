import { Oas3Rule, Oas2Rule } from '../../visitors';
import { Oas2PathItem } from '../../typings/swagger';
import { Oas3PathItem } from '../../typings/openapi';
import { UserContext } from '../../walk';
import { splitCamelCaseWithAbbreviations } from '../../utils';

const httpMethods = ['get', 'head', 'post', 'put', 'patch', 'delete', 'options', 'trace'];

function getMethodsFilterFunc(urlPart: string, splitWords: boolean) {
  let func;
  if (splitWords) {
    const splittedArr = splitCamelCaseWithAbbreviations(urlPart);
    func = (method: string) => splittedArr.some((s) => s === method);
  } else {
    func = (method: string) => urlPart.toLocaleLowerCase().includes(method);
  }
  return func;
}

export const NoHttpVerbsInPaths: Oas3Rule | Oas2Rule = ({ splitWords }) => {
  return {
    PathItem(_path: Oas2PathItem | Oas3PathItem, { report, key, location }: UserContext) {
      const pathKey = key.toString();
      if (pathKey.startsWith('/')) {
        const urlParts = pathKey.split('/');
        for (const urlPart of urlParts) {
          if (urlPart && !urlPart.match(/[^{]+(?=\})/g)) {
            const filterFunc = getMethodsFilterFunc(urlPart, splitWords);
            const isHttpMethodIncluded = httpMethods.filter(filterFunc);
            if (isHttpMethodIncluded.length) {
              report({
                message: `path: \`${pathKey}\` should not contain ${isHttpMethodIncluded[0]}`,
                location: location.key(),
              });
            }
          }
        }
      }
    },
  };
};

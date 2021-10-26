import { Oas2Rule, Oas3Rule } from '../../visitors';
import { Oas2PathItem } from '../../typings/swagger';
import { Oas3PathItem } from '../../typings/openapi';
import { UserContext } from '../../walk';

export const PathExcludesExpression: Oas3Rule | Oas2Rule = ({ patterns }) => {
  return {
    PathItem(_path: Oas2PathItem | Oas3PathItem, { report, key, location }: UserContext) {
      if (!patterns) return;
      const pathKey = key.toString();
      if (pathKey.startsWith('/')) {
        const urlParts = pathKey.split('/');
        for (const urlPart of urlParts) {
          if (urlPart && !urlPart.match(/[^{]+(?=\})/g)) {
            const isHttpMethodIncluded = patterns.filter((pattern: string) =>
              urlPart.toLocaleLowerCase().match(pattern),
            );
            for (const match of isHttpMethodIncluded) {
              report({
                message: `path: \`${pathKey}\` is invalid based on expression: ${match}`,
                location: location.key(),
              });
            }
          }
        }
      }
    },
  };
};

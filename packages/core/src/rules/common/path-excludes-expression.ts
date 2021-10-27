import { Oas2Rule, Oas3Rule } from '../../visitors';
import { Oas2PathItem } from '../../typings/swagger';
import { Oas3PathItem } from '../../typings/openapi';
import { UserContext } from '../../walk';

export const PathExcludesExpression: Oas3Rule | Oas2Rule = ({ patterns }) => {
  return {
    PathItem(_path: Oas2PathItem | Oas3PathItem, { report, key, location }: UserContext) {
      if (!patterns)
        throw new Error(`Parameter "patterns" is not provided for "path-excludes-expression" rule`);
      const pathKey = key.toString();
      if (pathKey.startsWith('/')) {
        const urlParts = pathKey.split('/');
        for (const urlPart of urlParts) {
          if (urlPart && !urlPart.match(/[^{]+(?=\})/g)) {
            const matches = patterns.filter((pattern: string) =>
              urlPart.toLocaleLowerCase().match(pattern),
            );
            for (const match of matches) {
              report({
                message: `path: \`${pathKey}\` should not match pattern: \`${match}\``,
                location: location.key(),
              });
            }
          }
        }
      }
    },
  };
};

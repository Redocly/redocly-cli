import type { Oas2Rule, Oas3Rule } from '../../visitors.js';
import type { Oas2PathItem } from '../../typings/swagger.js';
import type { Oas3PathItem } from '../../typings/openapi.js';
import type { UserContext } from '../../walk.js';

export const PathExcludesPatterns: Oas3Rule | Oas2Rule = ({ patterns }) => {
  return {
    PathItem(_path: Oas2PathItem | Oas3PathItem, { report, key, location }: UserContext) {
      if (!patterns)
        throw new Error(`Parameter "patterns" is not provided for "path-excludes-patterns" rule`);
      const pathKey = key.toString();
      if (pathKey.startsWith('/')) {
        const matches = patterns.filter((pattern: string) => pathKey.match(pattern));
        for (const match of matches) {
          report({
            message: `path \`${pathKey}\` should not match regex pattern: \`${match}\``,
            location: location.key(),
          });
        }
      }
    },
  };
};

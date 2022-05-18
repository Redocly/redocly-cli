import { Oas3Rule, Oas2Rule } from '../../visitors';
import { UserContext } from '../../walk';
import { Oas3Paths } from '../../typings/openapi';
import { Oas2Paths } from '../../typings/swagger';

export const NoIdenticalPaths: Oas3Rule | Oas2Rule = () => {
  return {
    PathMap(pathMap: Oas3Paths | Oas2Paths, { report, location }: UserContext) {
      const pathsMap = new Map<string, string>();
      for (const pathName of Object.keys(pathMap)) {
        const id = pathName.replace(/{.+?}/g, '{VARIABLE}');
        const existingSamePath = pathsMap.get(id);
        if (existingSamePath) {
          report({
            message: `The path already exists which differs only by path parameter name(s): \`${existingSamePath}\` and \`${pathName}\`.`,
            location: location.child([pathName]).key(),
          });
        } else {
          pathsMap.set(id, pathName);
        }
      }
    },
  };
};

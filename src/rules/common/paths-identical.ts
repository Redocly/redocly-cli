import { Oas3Rule, Oas2Rule } from '../../visitors';
import { UserContext } from '../../walk';
import { Oas3Paths } from '../../typings/openapi';

export const PathsIdentical: Oas3Rule | Oas2Rule = () => {
  return {
    PathMap(pathMap: Oas3Paths, { report, location }: UserContext) {
      const pathsSet = new Set<string>();
      for (const pathName of Object.keys(pathMap)){ 
        const name = pathName.replace(/{.+}/, '{VARIABLE}');
        if (pathsSet.has(name)) {
          report({
            message: 'The path already exists which differs only by path parameter name(s).',
            location: location.child([pathName]).key(),
          })
        } else {
          pathsSet.add(name);
        }
      }
    }
  };
};

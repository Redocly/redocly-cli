import { UserContext } from '../../walk';
import { isRedoclyRegistryURL } from '../../redocly';

import { Oas3Decorator, Oas2Decorator } from '../../visitors';

export const RegistryDependencies: Oas3Decorator | Oas2Decorator = () => {
  let registryDependencies = new Set<string>();

  return {
    DefinitionRoot: {
      leave(_: any, ctx: UserContext) {
        const data = ctx.getVisitorData();
        data.links = Array.from(registryDependencies);
      },
    },
    ref(node) {
      if (node.$ref) {
        const link = node.$ref.split('#/')[0];
        if (isRedoclyRegistryURL(link)) {
          registryDependencies.add(link);
        }
      }
    },
  };
};

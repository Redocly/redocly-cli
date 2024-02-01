import { UserContext } from '../../walk';
import { RedoclyClient } from '../../redocly';

import { Oas3Decorator, Oas2Decorator } from '../../visitors';

export const RegistryDependencies: Oas3Decorator | Oas2Decorator = () => {
  const registryDependencies = new Set<string>();

  return {
    Root: {
      leave(_: any, ctx: UserContext) {
        const data = ctx.getVisitorData();
        data.links = Array.from(registryDependencies);
      },
    },
    ref(node) {
      if (node.$ref) {
        const link = node.$ref.split('#/')[0];
        if (RedoclyClient.isRedoclyRegistryURL(link)) {
          registryDependencies.add(link);
        }
      }
    },
  };
};

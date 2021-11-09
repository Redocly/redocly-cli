import { RedoclyClient } from '../../redocly';

import { Oas3Decorator, Oas2Decorator } from '../../visitors';

export const RegistryDependencies: Oas3Decorator | Oas2Decorator = () => {
  let registryDependencies = new Set<string>();

  return {
    ref(node) {
      if (node.$ref) {
        const link = node.$ref.split('#/')[0];
        if (RedoclyClient.isRegistryURL(link)) {
          registryDependencies.add(link);
        }
      }
    },
  };
};

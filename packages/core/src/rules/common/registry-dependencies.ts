import { RedoclyClient } from '../../redocly';

import { Oas3Decorator, Oas2Decorator } from '../../visitors';

export const RegistryDependencies: Oas3Decorator | Oas2Decorator = () => {
  let redoclyClient: RedoclyClient;
  let registryDependencies = new Set<string>();

  return {
    DefinitionRoot: {
      leave() {
        redoclyClient = new RedoclyClient();
        if (process.env.UPDATE_REGISTRY && redoclyClient.hasToken()) {
          redoclyClient.updateDependencies(Array.from(registryDependencies.keys()));
        }
      },
    },
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

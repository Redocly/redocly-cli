import { RedoclyClient } from '../../redocly';

import { Oas3Decorator, Oas2Decorator } from '../../visitors';

export const RegistryDependencies: Oas3Decorator | Oas2Decorator = () => {
  let redoclyClient: RedoclyClient;
  let registryDependencies = new Set<string>();

  return {
    DefinitionRoot: {
      leave() {
        console.warn('leave arguments', arguments);

        redoclyClient = new RedoclyClient(''); // FIXME: how to get a config for domain there?

        if (process.env.UPDATE_REGISTRY && redoclyClient.hasToken()) {
          redoclyClient.updateDependencies(Array.from(registryDependencies.keys()));
        }
      },
    },
    ref(node) {
      console.warn('ref ' +
        'arguments', arguments);
      if (node.$ref) {
        const link = node.$ref.split('#/')[0];
        redoclyClient = new RedoclyClient(''); // FIXME: how to get a config for domain there?

        if (redoclyClient.isRegistryURL(link)) {
          registryDependencies.add(link);
        }
      }
    },
  };
};

import { RedoclyClient } from '../../redocly';
import { Oas3Decorator, Oas2Decorator } from '../../visitors';

export const RegistryDependencies: Oas3Decorator | Oas2Decorator = () => {
  let redoclyClient: RedoclyClient;
  let registryDependencies = new Set<string>();

  return {
    DefinitionRoot: {
      leave() {
        if (!process.env.REDOCLY_DOMAIN) {
          throw new Error('Redocly domain is not set');
        }

        redoclyClient = new RedoclyClient(process.env.REDOCLY_DOMAIN);

        if (process.env.UPDATE_REGISTRY && redoclyClient.hasToken()) {
          redoclyClient.updateDependencies(Array.from(registryDependencies.keys()));
        }
      },
    },
    ref(node) {
      if (!process.env.REDOCLY_DOMAIN) {
        throw new Error('Redocly domain is not set');
      }

      if (node.$ref) {
        const link = node.$ref.split('#/')[0];
        redoclyClient = new RedoclyClient(process.env.REDOCLY_DOMAIN);

        if (redoclyClient.isRegistryURL(link)) {
          registryDependencies.add(link);
        }
      }
    },
  };
};

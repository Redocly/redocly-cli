import { RedoclyClient } from '../../redocly';

import { Oas3Rule, Oas2Rule } from '../../visitors';

const fullyQualifiedUrlPattern = new RegExp(
  '^(https?:\\/\\/)' + // protocol
  '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
  '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
  '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
  '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
    '(\\#[-a-z\\d_]*)?$',
  'i',
); // fragment locator

export const isFullyQualifiedUrl = (string: string) => fullyQualifiedUrlPattern.test(string);

export const RegistryDependencies: Oas3Rule | Oas2Rule = () => {
  let redoclyClient: RedoclyClient;
  let registryDependencies: string[] = [];

  return {
    DefinitionRoot: {
      leave() {
        redoclyClient = new RedoclyClient();
        if (process.env.UPDATE_REGISTRY && redoclyClient.hasToken()) {
          redoclyClient.updateDependencies(registryDependencies);
        }
      },
    },
    ref(node) {
      if (node.$ref) {
        const link = node.$ref.split('#/')[0];
        if (isFullyQualifiedUrl(link) && RedoclyClient.isRegistryURL(link)) {
          registryDependencies.push(link);
        }
      }
    },
  };
};

import { bundleConfig } from '../../packages/core/lib/bundle.js';
import { BaseResolver } from '../../packages/core/lib/resolve.js';
import { resolveConfigFileAndRefs } from '../../packages/core/lib/config/config-resolvers.js';

const externalRefResolver = new BaseResolver();
const configPath = 'resources/bundle-extends/redocly.yaml';
const { document, resolvedRefMap } = await resolveConfigFileAndRefs({
  configPath,
  externalRefResolver,
});

const config = await bundleConfig(document, resolvedRefMap);

console.log(JSON.stringify(config, null, 2));
import { bundleOas, loadConfig } from '@redocly/openapi-core/lib/bundle-oas';

// import { loadConfig } from '@redocly/openapi-core/lib/config/config';

const test = await bundleOas({
  ref: 'test.yaml',
  config: await loadConfig({}),
} as any);

console.log(test);

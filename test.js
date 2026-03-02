import { loadConfig, BaseResolver } from '@redocly/openapi-core';

async function test() {
  const externalRefResolver = new BaseResolver();
  const config = await loadConfig({
    configPath: '/Users/albinablazhko/Downloads/scorecard-classic-repro/redocly.yaml',
    externalRefResolver,
  });

  console.log('Loaded config:', JSON.stringify(config.resolvedConfig.scorecard, null, 2));
}

await test();

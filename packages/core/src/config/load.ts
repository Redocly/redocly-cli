import * as fs from 'fs';
import { RedoclyClient } from '../redocly';
import { loadYaml } from '../utils';
import { Config, DOMAINS, RawConfig, Region } from './config';

import { defaultPlugin } from './builtIn';

export async function loadConfig(configPath?: string, customExtends?: string[]): Promise<Config> {
  if (configPath === undefined) {
    configPath = findConfig();
  }
  let rawConfig: RawConfig = {};

  if (configPath !== undefined) {
    try {
      rawConfig = (await loadYaml(configPath)) as RawConfig;
    } catch (e) {
      throw new Error(`Error parsing config file at \`${configPath}\`: ${e.message}`);
    }
  }
  if (customExtends !== undefined) {
    rawConfig.lint = rawConfig.lint || {};
    rawConfig.lint.extends = customExtends;
  }

  const redoclyClient = new RedoclyClient();
  const tokens = await redoclyClient.getTokens();

  if (tokens.length) {
    if (!rawConfig.resolve) rawConfig.resolve = {};
    if (!rawConfig.resolve.http) rawConfig.resolve.http = {};
    rawConfig.resolve.http.headers = [...(rawConfig.resolve.http.headers ?? [])];

    for (const item of tokens) {
      const domain = DOMAINS[item.region as Region];
      rawConfig.resolve.http.headers.push({
        matches: `https://api.${domain}/registry/**`,
        name: 'Authorization',
        envVariable: undefined,
        value: item.token,
      },
      //support redocly.com domain for future compatibility
      ...(item.region === 'us' ? [{
        matches: `https://api.redocly.com/registry/**`,
        name: 'Authorization',
        envVariable: undefined,
        value: item.token,
      }] : []));
    }
  }

  return new Config(
    {
      ...rawConfig,
      lint: {
        ...rawConfig?.lint,
        plugins: [...(rawConfig?.lint?.plugins || []), defaultPlugin], // inject default plugin
      },
    },
    configPath,
  );
}

export function findConfig(): string | undefined {
  const possibleConfigNames = [
    'redocly.yaml',
    'redocly.yml',
    '.redocly.yaml',
    '.redocly.yml',
  ];
  const existingConfigFiles = possibleConfigNames
    .map((name) => fs.existsSync(name) && name)
    .filter(Boolean) as Array<string | never>;
  if (existingConfigFiles.length > 1) {
    throw new Error(`
      Multiple configuration files are not allowed. 
      Found the following files: ${existingConfigFiles.join(', ')}. 
      Please use 'redocly.yaml' instead.
    `);
  }
  return existingConfigFiles[0];
}

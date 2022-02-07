import * as fs from 'fs';
import { RedoclyClient } from '../redocly';
import { loadYaml } from '../utils';
import { Config, DOMAINS, RawConfig, Region } from './config';
import { defaultPlugin } from './builtIn';

export async function loadConfig(configPath?: string, customExtends?: string[]): Promise<Config> {
  const rawConfig = await getConfig(configPath);

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

function configTransformer(rawConfig: RawConfig) {
  if (!rawConfig.apiDefinitions) return rawConfig;

  const config = {} as any;
  const keysToChange = ['apiDefinitions', 'referenceDocs'];

  for (const [key, value] of Object.entries(rawConfig)) {
    if (key === 'apiDefinitions') {
      config.apis = {};
      for (const [apiName, apiPath] of Object.entries(value)) {
        config.apis[apiName+'@latest'] = { 'root': apiPath };
      }
    }
    if (key === 'referenceDocs') { config['features.openapi'] = value; }
    if (!keysToChange.includes(key)) { config[key] = value; }
  }
  return config;
}

export async function getConfig(path?: string) {
  let rawConfig: RawConfig = {};
  const configPath = path || findConfig();
  if (configPath) {
    try {
      rawConfig = (await loadYaml(configPath)) as RawConfig;
    } catch (e) {
      throw new Error(`Error parsing config file at \`${configPath}\`: ${e.message}`);
    }
  }
  return configTransformer(rawConfig);
}

function findConfig() {
  if (fs.existsSync('.redocly.yaml')) {
    return '.redocly.yaml';
  } else if (fs.existsSync('.redocly.yml')) {
    return '.redocly.yml';
  }
  return undefined;
}

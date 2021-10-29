import * as fs from 'fs';

import { RedoclyClient } from '../redocly';
import { loadYaml } from '../utils';
import { Config, getRedoclyDomainByRegion, RawConfig, Region } from './config';

import { defaultPlugin } from './builtIn';

async function loadRawConfig(configPath?: string): Promise<RawConfig> {
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

  return rawConfig;
}

export async function loadConfig(configPath?: string, customExtends?: string[]): Promise<Config> {
  const rawConfig = await loadRawConfig(configPath);

  if (customExtends !== undefined) {
    rawConfig.lint = rawConfig.lint || {};
    rawConfig.lint.extends = customExtends;
  }

  const redoclyDomain = await resolveRedoclyDomain({
    preloadedRawConfig: rawConfig
  });

  const redoclyClient = new RedoclyClient(redoclyDomain);
  if (redoclyClient.hasToken()) {
    if (!rawConfig.resolve) rawConfig.resolve = {};
    if (!rawConfig.resolve.http) rawConfig.resolve.http = {};
    rawConfig.resolve.http.headers = [
      {
        matches: `https://api.${redoclyDomain}/registry/**`,
        name: 'Authorization',
        envVariable: undefined,
        value: (redoclyClient && (await redoclyClient.getAuthorizationHeader())) || '',
      },
      ...(rawConfig.resolve.http.headers ?? []),
    ];
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

function findConfig() {
  if (fs.existsSync('.redocly.yaml')) {
    return '.redocly.yaml';
  } else if (fs.existsSync('.redocly.yml')) {
    return '.redocly.yml';
  }
  return undefined;
}

export async function resolveRedoclyDomain({
   region,
   configPath,
   preloadedRawConfig,
}: {
  region?: Region,
  configPath?: string,
  preloadedRawConfig?: RawConfig,
}): Promise<string> {
  if (region) {
    return getRedoclyDomainByRegion(region);
  }

  const rawConfig: RawConfig = preloadedRawConfig || await loadRawConfig(configPath);

  if (rawConfig.resolve && rawConfig.resolve.region) {
    return getRedoclyDomainByRegion(rawConfig.resolve.region);
  }

  return process.env.REDOCLY_DOMAIN || getRedoclyDomainByRegion('eu');
}

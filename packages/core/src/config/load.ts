import * as fs from 'fs';
import * as path from 'path';
import { RedoclyClient } from '../redocly';
import { loadYaml, parseYaml } from '../utils';
import { Config, DOMAINS } from './config';
import { getResolveConfig, getUniquePlugins, mergeExtends, parsePresetName, resolveApis, resolvePlugins, transformConfig } from './utils';
import { isAbsoluteUrl } from '../ref-utils';
import { BaseResolver } from '../resolve';

import type {
  LintRawConfig,
  Plugin,
  RawConfig,
  RawResolveConfig,
  Region,
} from './types';
import recommended from './recommended';
import { red } from 'colorette';
import { defaultPlugin } from './builtIn';

export async function loadConfig(
  configPath: string | undefined = findConfig(),
  customExtends?: string[],
): Promise<Config> {
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
        matches: `https://api.redoc.ly/registry/**`,
        name: 'Authorization',
        envVariable: undefined,
        value: item.token,
      }] : []));
    }
  }


  const lint = await resolveLint({
        lintConfig: rawConfig?.lint,
        configPath,
        resolve: rawConfig.resolve,
      })

  const apis = rawConfig.apis
    ? await resolveApis({
        apis: rawConfig.apis,
        configPath,
        resolve: rawConfig.resolve,
        lintConfig: rawConfig?.lint || {},
      })
    : rawConfig.apis;



  return new Config(
    {
      ...rawConfig,
      apis,
      lint: {
        ...lint,
      },
    },
    configPath,
  );
}

export const CONFIG_FILE_NAMES = ['redocly.yaml', 'redocly.yml', '.redocly.yaml', '.redocly.yml'];

export function findConfig(dir?: string): string | undefined {
  if (!fs.hasOwnProperty('existsSync')) return;
  const existingConfigFiles = CONFIG_FILE_NAMES
    .map(name => dir ? path.resolve(dir, name) : name)
    .filter(fs.existsSync);
  if (existingConfigFiles.length > 1) {
    throw new Error(`
      Multiple configuration files are not allowed. 
      Found the following files: ${existingConfigFiles.join(', ')}. 
      Please use 'redocly.yaml' instead.
    `);
  }
  return existingConfigFiles[0];
}

export async function getConfig(configPath: string | undefined = findConfig()) {
  if (!configPath) return {};
  try {
    const rawConfig = ((await loadYaml(configPath)) || {}) as RawConfig;
    return transformConfig(rawConfig);
  } catch (e) {
    throw new Error(`Error parsing config file at '${configPath}': ${e.message}`);
  }
}

export async function resolveLint({
  lintConfig,
  configPath = '',
  resolve,
}: {
  lintConfig?: LintRawConfig;
  configPath?: string;
  resolve?: RawResolveConfig;
}): Promise<LintRawConfig> {
  // if (!lintConfig && isApi) return {};
  const plugins = getUniquePlugins(resolvePlugins([...(lintConfig?.plugins || []), defaultPlugin], configPath));
  const extendConfigs: LintRawConfig[] = lintConfig?.extends
    ? await Promise.all(
        lintConfig.extends.map(async (presetName) => {
          const pathItem = isAbsoluteUrl(presetName)
            ? presetName
            : path.resolve(path.dirname(configPath), presetName);
          if (isAbsoluteUrl(pathItem) || fs.existsSync(pathItem)) {
            const extendedLintConfig = await loadExtendLintConfig(pathItem, resolve);
            return await resolveLint({
              lintConfig: extendedLintConfig,
              configPath: pathItem,
              resolve,
            });
          }
          const { pluginId, configName } = parsePresetName(presetName);
          const plugin = plugins.find((p) => p.id === pluginId);
          if (!plugin) {
            throw new Error(
              `Invalid config ${red(presetName)}: plugin ${pluginId} is not included.`,
            );
          }
          const preset = plugin.configs?.[configName]!;
          if (!preset) {
            throw new Error(
              pluginId
                ? `Invalid config ${red(
                    presetName,
                  )}: plugin ${pluginId} doesn't export config with name ${configName}.`
                : `Invalid config ${red(presetName)}: there is no such built-in config.`,
            );
          }
          return preset;
        }),
      )
    : [recommended];
  if (lintConfig?.rules || lintConfig?.preprocessors || lintConfig?.decorators) {
    extendConfigs.push({
      rules: lintConfig?.rules,
      preprocessors: lintConfig?.preprocessors,
      decorators: lintConfig?.decorators,
    });
  }
  const {plugins: mergedPlugins, ...lint} = mergeExtends(extendConfigs);
  return {
    ...lint,
    plugins: getUniquePlugins([...plugins, ...(mergedPlugins as Plugin[])]),
    recommendedFallback: !lintConfig?.extends ? true : false,
  } as LintRawConfig;
}

async function loadExtendLintConfig(
  filePath: string,
  resolve?: RawResolveConfig,
): Promise<LintRawConfig> {
  try {
    const fileSource = await new BaseResolver(getResolveConfig(resolve)).loadExternalRef(filePath);
    const rawConfig = transformConfig(parseYaml(fileSource.body) as RawConfig);

    if (!rawConfig.lint) {
      throw new Error(`Lint configuration format not detected (${filePath})`);
    }

    return rawConfig.lint;
  } catch (error) {
    throw new Error(`File not found (${filePath})`);
  }
}

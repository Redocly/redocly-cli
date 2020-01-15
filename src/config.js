import fs from 'fs';
import merge from 'merge-deep';
import yaml from 'js-yaml';
import * as path from 'path';

let warningShown = false;

export function getConfig(options) {
  let config = {};
  let { configPath } = options;
  if (!configPath) {
    configPath = `${process.cwd()}/.openapi-cli.yaml`;

    if (fs.existsSync('.redocly.yaml')) {
      configPath = path.resolve('.redocly.yaml');
    } else if (fs.existsSync('.redocly.yml')) {
      configPath = path.resolve('.redocly.yml');
    } else if (fs.existsSync('.openapi-cli.yaml')) {
      if (!warningShown) process.stderr.write('warning: .openapi-cli.yaml is deprecated, rename to .redocly.yaml\n');
      configPath = path.resolve('.openapi-cli.yaml');
    } else if (fs.existsSync('.openapi-cli.yml')) {
      if (!warningShown) process.stderr.write('warning: .openapi-cli.yml is deprecated, rename to .redocly.yml\n');
      configPath = path.resolve('.openapi-cli.yml');
    }
  }

  const defaultConfigRaw = fs.readFileSync(`${__dirname}/.redocly.yaml`, 'utf-8');
  const defaultConfig = yaml.safeLoad(defaultConfigRaw);

  if (fs.existsSync(configPath)) {
    const configRaw = fs.readFileSync(configPath, 'utf-8');
    config = yaml.safeLoad(configRaw);

    if (config.rules || config.transformers || config.typeExtension || config.customRules) {
      if (!warningShown) {
        process.stderr.write(
          'warning: top level "rules", "transformers", "typeExtension" and "customRules" '
          + 'are deprecated. Move them under the "lint" field.\n',
        );
      }

      warningShown = true;

      config = { lint: config };
    }
  }

  const resolvedConfig = merge(defaultConfig, config, options);
  resolvedConfig.configPath = configPath;

  const lintConfig = resolvedConfig.lint;

  if (!lintConfig.typeExtension) {
    lintConfig.typeExtension = `${__dirname}/typeExtensionDefault.js`;
  } else {
    lintConfig.typeExtension = `${process.cwd()}/${lintConfig.typeExtension}`;
  }

  const definitionResolver = require(lintConfig.typeExtension);

  lintConfig.definitionResolver = definitionResolver;

  lintConfig.customRules = lintConfig.customRules
    ? `${process.cwd()}/${lintConfig.customRules}` : `${__dirname}/customRulesDefault.js`;
  const rulesExtensions = require(lintConfig.customRules);
  lintConfig.rulesExtensions = rulesExtensions;

  lintConfig.transformers = lintConfig.transformers
    ? `${process.cwd()}/${lintConfig.transformers}` : `${__dirname}/customRulesDefault.js`;
  const transformingVisitors = require(lintConfig.transformers);
  lintConfig.transformingVisitors = transformingVisitors;

  return resolvedConfig;
}

export function getLintConfig(options) {
  return getConfig(options).lint;
}

export function getFallbackEntryPointsOrExit(argsEntrypoints, config = getConfig({})) {
  let res = argsEntrypoints;
  if (
    (!argsEntrypoints || !argsEntrypoints.length)
    && config.apiDefinitions
    && Object.keys(config.apiDefinitions).length > 0
  ) {
    res = Object.values(config.apiDefinitions);
  }

  if (!res || !res.length) {
    process.stderr.write('error: missing required argument "entryPoints"\n');
    process.exit(1);
  }

  return res;
}

import fs from 'fs';
import merge from 'merge-deep';
import yaml from 'js-yaml';

function getConfig(options) {
  let config = {};
  let { configPath } = options;
  if (!configPath) {
    configPath = `${process.cwd()}/.openapi-cli.yaml`;

    if (fs.existsSync(`${process.cwd()}/.openapi-cli.yaml`)) {
      configPath = `${process.cwd()}/.openapi-cli.yaml`;
    }

    if (fs.existsSync(`${process.cwd()}/.openapi-cli.yml`)) {
      configPath = `${process.cwd()}/.openapi-cli.yml`;
    }
  }

  const defaultConfigRaw = fs.readFileSync(`${__dirname}/.openapi-cli.yaml`, 'utf-8');
  const defaultConfig = yaml.safeLoad(defaultConfigRaw);

  if (fs.existsSync(configPath)) {
    const configRaw = fs.readFileSync(configPath, 'utf-8');
    config = yaml.safeLoad(configRaw);
  }

  const resolvedConfig = merge(defaultConfig, config, options);

  if (!resolvedConfig.typeExtension) {
    resolvedConfig.typeExtension = `${__dirname}/typeExtensionDefault.js`;
  } else {
    resolvedConfig.typeExtension = `${process.cwd()}/${resolvedConfig.typeExtension}`;
  }

  const { extend, define } = require(resolvedConfig.typeExtension);

  for (let i = 0; i < Object.keys(extend).length; i++) {
    const pathToDefaultType = `${__dirname}/types/${Object.keys(extend)[i]}.js`;
    if (!fs.existsSync(pathToDefaultType)) {
      throw new Error(`${Object.keys(extend)[i]} is not a default type. Use "define" section instead.`);
    }
  }

  for (let i = 0; i < Object.keys(define).length; i++) {
    const pathToDefaultType = `${__dirname}/types/${Object.keys(define)[i]}.js`;
    if (fs.existsSync(pathToDefaultType)) {
      throw new Error(`${Object.keys(define)[i]} is a default type. Use "extend" section instead.`);
    }
  }

  resolvedConfig.typeExtension = {
    ...extend,
    ...define,
  };

  return resolvedConfig;
}

export default getConfig;

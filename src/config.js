import fs from 'fs';
import merge from 'merge-deep';
import yaml from 'js-yaml';

function getConfig(options) {
  let config = {};
  let { configPath } = options;
  if (!configPath) configPath = `${process.cwd()}/revalid.config.json`;

  const defaultConfigRaw = fs.readFileSync(`${__dirname}/revalid.default.config.json`, 'utf-8');
  const defaultConfig = yaml.safeLoad(defaultConfigRaw);

  if (fs.existsSync(configPath)) {
    const configRaw = fs.readFileSync(configPath, 'utf-8');
    config = yaml.safeLoad(configRaw);
  }

  const resolvedConfig = merge(defaultConfig, config);
  // console.log(resolvedConfig);
  return resolvedConfig;
}

export default getConfig;

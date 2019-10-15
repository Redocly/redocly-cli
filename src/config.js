import fs from 'fs';
import merge from 'merge-deep';

function getConfig(options) {
  let config = {};
  let { configPath } = options;
  if (!configPath) configPath = `${process.cwd()}/revalid.config.json`;

  const defaultConfigRaw = fs.readFileSync(`${__dirname}/revalid.default.config.json`, 'utf-8');
  const defaultConfig = JSON.parse(defaultConfigRaw);

  if (fs.existsSync(configPath)) {
    const configRaw = fs.readFileSync(configPath, 'utf-8');
    config = JSON.parse(configRaw);
  }

  const resolvedConfig = merge(defaultConfig, config);
  return resolvedConfig;
}

export default getConfig;

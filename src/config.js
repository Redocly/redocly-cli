import fs from 'fs';

function getConfig(options) {
  let config = {};
  let { configPath } = options;
  if (!configPath) configPath = `${process.cwd()}/revalid.config.json`;


  if (fs.existsSync(configPath)) {
    const configRaw = fs.readFileSync(configPath, 'utf-8');
    config = JSON.parse(configRaw);
  }

  return {
    enableCodeframe: true,
    enbaleCustomRuleset: true,
    ...config,
    ...options,
  };
}

export default getConfig;

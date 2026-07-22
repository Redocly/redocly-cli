import yaml from 'js-yaml';
import fs from 'node:fs';
import path from 'node:path';

export const applyRootSecurity = ({ pathSecurityFile } = {}) => {
  let source = null;

  return {
    Root: {
      enter(_root, { config }) {
        source = resolvePath(pathSecurityFile, config);
      },
      leave(root) {
        if (
          Array.isArray(source?.security) &&
          JSON.stringify(root.security) !== JSON.stringify(source.security)
        ) {
          root.security = [...(root.security || []), ...source.security];
        }
        if (source?.components?.securitySchemes) {
          root.components = root.components || {};
          root.components.securitySchemes = {
            ...root.components.securitySchemes,
            ...source.components.securitySchemes,
          };
        }
      },
    },
  };
};

function resolvePath(pathSecurityFile, config) {
  const base = config.configPath ? path.dirname(config.configPath) : process.cwd();
  const absolutePath = path.isAbsolute(pathSecurityFile)
    ? pathSecurityFile
    : path.resolve(base, pathSecurityFile);
  return yaml.load(fs.readFileSync(absolutePath, 'utf8'));
}

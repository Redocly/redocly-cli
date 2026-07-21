export const applyRootSecurity = ({ pathSecurityFile } = {}) => {
  let source = null;

  return {
    Root: {
      enter(_root, { config }) {
        source = resolvePath(pathSecurityFile, config);
      },
      leave(root) {
        if (
          !Array.isArray(source?.security) ||
          JSON.stringify(root.security) === JSON.stringify(source?.security)
        )
          return;
        root.security = [...(root.security || []), ...source.security];
      },
    },
    Components(components) {
      if (source?.components?.securitySchemes) {
        components.securitySchemes = {
          ...components.securitySchemes,
          ...source.components.securitySchemes,
        };
      }
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

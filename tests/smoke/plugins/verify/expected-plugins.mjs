export const variantByPluginId = {
  'cjs-plugin': '.cjs, which Node always loads as CommonJS',
  'esm-plugin': '.mjs, which Node always loads as ESM',
  'js-plugin': '.js, whose format comes from the nearest package.json `type` field',
  'multi-plugin-first': 'one module returning several plugins (first)',
  'multi-plugin-second': 'one module returning several plugins (second)',
  'nested-import-plugin': 'ESM plugin importing a sibling module',
  'theme-plugin': '@theme/plugin.mjs found by auto-discovery',
};

export const packagePluginId = 'asyncapi';

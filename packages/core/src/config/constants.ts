export const CONFIG_FILE_NAME = 'redocly.yaml';

export const DEFAULT_CONFIG = { extends: ['recommended'] };

export const IGNORE_FILE = '.redocly.lint-ignore.yaml';
export const IGNORE_BANNER =
  `# This file instructs Redocly's linter to ignore the rules contained for specific parts of your API.\n` +
  `# See https://redocly.com/docs/cli/ for more information.\n`;

export const CONFIG_BUNDLER_VISITOR_ID = 'configBundler';
export const PLUGINS_COLLECTOR_VISITOR_ID = 'pluginsCollector';
export const DEFAULT_PROJECT_PLUGIN_PATHS = [
  '@theme/plugin.js',
  '@theme/plugin.cjs',
  '@theme/plugin.mjs',
];

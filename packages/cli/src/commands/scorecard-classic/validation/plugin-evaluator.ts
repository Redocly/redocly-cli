import type { Plugin } from '@redocly/openapi-core';

type PluginFunction = () => Plugin;

type PluginsModule = {
  default: PluginFunction[];
};

export async function evaluatePluginsFromCode(pluginsCode?: string): Promise<Plugin[]> {
  if (!pluginsCode) {
    return [];
  }

  try {
    // TODO: hotfix for Windows. Related: https://github.com/Redocly/redocly/pull/18127
    const normalizedDirname =
      typeof __dirname === 'undefined' ? '' : __dirname.replaceAll(/\\/g, '/');
    // https://github.com/Redocly/redocly/pull/17602
    const pluginsCodeWithDirname = pluginsCode.replaceAll(
      '__redocly_dirname',
      `"${normalizedDirname}"`
    );
    const base64 = btoa(pluginsCodeWithDirname);
    const dataUri = `data:text/javascript;base64,${base64}`;
    const module: PluginsModule = await import(dataUri);
    const evaluatedPlugins = module.default.map((pluginFunction) => pluginFunction());

    return evaluatedPlugins;
  } catch (error) {
    return [];
  }
}

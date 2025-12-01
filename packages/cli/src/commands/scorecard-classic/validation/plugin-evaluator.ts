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
    const normalizedDirname =
      typeof __dirname === 'undefined' ? '' : __dirname.replaceAll(/\\/g, '/');
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

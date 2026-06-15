// packages/openapi-typescript/src/config-file.ts
import { existsSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { Config } from './config.js';

const DEFAULT_NAMES = [
  'redocly-openapi-typescript.config.ts',
  'redocly-openapi-typescript.config.mjs',
  'redocly-openapi-typescript.config.js',
];

/**
 * Load a config file's default export. With an explicit `path`, imports it; else
 * discovers a default-named config in `cwd`. Returns `undefined` when none is found.
 *
 * Uses native dynamic `import()` — no transpiler dependency. `.ts` configs require
 * a host runtime that strips types (Node >= 22.18); otherwise pass a `.mjs`/`.js`
 * config or run under a TS-capable runtime.
 */
export async function loadConfigFile(
  path: string | undefined,
  cwd: string = process.cwd()
): Promise<Config | undefined> {
  const resolved = path
    ? isAbsolute(path)
      ? path
      : resolve(cwd, path)
    : DEFAULT_NAMES.map((name) => join(cwd, name)).find((candidate) => existsSync(candidate));
  if (!resolved) return undefined;
  const module = (await import(pathToFileURL(resolved).href)) as { default?: Config };
  if (!module.default) {
    throw new Error(`Config file ${resolved} must \`export default\` a config object.`);
  }
  return module.default;
}

/**
 * Merge a base config (from a file) with CLI overrides. Defined keys in
 * `overrides` win; `undefined` override values are ignored so absent flags don't
 * clobber file values.
 */
export function mergeConfig(base: Partial<Config>, overrides: Partial<Config>): Partial<Config> {
  const merged: Partial<Config> = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined) (merged as Record<string, unknown>)[key] = value;
  }
  return merged;
}

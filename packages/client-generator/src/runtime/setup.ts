import type { ClientConfig, Middleware } from './types.js';

/**
 * Merge a publisher's baked setup (`defineClientSetup({...})`) with the app's config:
 * app config fields win per-field over baked defaults, while middleware composes —
 * baked middleware runs first, then the app's.
 */
export function mergeSetup(
  setup: { config?: ClientConfig; middleware?: Middleware[] } | undefined,
  config: ClientConfig = {}
): ClientConfig {
  return {
    ...setup?.config,
    ...config,
    middleware: [...(setup?.middleware ?? []), ...(config.middleware ?? [])],
  };
}

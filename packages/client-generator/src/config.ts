// packages/client-generator/src/config.ts
import type { GenerateClientOptions } from './types.js';

/**
 * A partial generation config: the shape of a `redocly.yaml` `client` block or a set
 * of CLI flag overrides. Every field is optional — `mergeConfig` (config-file.ts)
 * layers these onto each other, and the caller supplies `api`/`output` when invoking
 * `generateClient(...)`.
 */
export type GenerateClientConfig = Partial<GenerateClientOptions>;

import { getWriter } from '../writers/index.js';
import type { Generator } from './types.js';

/**
 * The default generator: the full typed client (model types + runtime + endpoints).
 * Delegates to the output-mode writer, so its bytes are identical to the pre-registry
 * pipeline. Other generators (zod, framework hooks) emit *additional* files alongside.
 */
export const sdkGenerator: Generator = ({ model, outputPath, outputMode, emit }) => {
  return getWriter(outputMode)({ model, outputPath, emit });
};

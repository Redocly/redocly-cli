import { emitClientSingleFile } from '../emitters/package-client.js';
import type { Writer } from './types.js';

/**
 * The default writer: the whole client in one file at the `--output` path. The shared
 * emitter branches on `emit.runtime` internally — `inline` (the default) embeds the
 * runtime sources, `package` imports them from `@redocly/client-generator`.
 */
export const singleFileWriter: Writer = ({ model, outputPath, emit }) => [
  { path: outputPath, content: emitClientSingleFile(model, emit) },
];

import { emitSingleFile } from '../emitters/client.js';
import type { Writer } from './types.js';

/**
 * The default writer: the whole client in one file at the `--output` path.
 * Delegates straight to `emitSingleFile`, so its output is unchanged from before
 * the writer seam existed.
 */
export const singleFileWriter: Writer = ({ model, outputPath, emit }) => {
  return [{ path: outputPath, content: emitSingleFile(model, emit) }];
};

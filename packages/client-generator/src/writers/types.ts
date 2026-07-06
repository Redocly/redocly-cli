import type { EmitOptions } from '../emitters/client.js';
import type { ApiModel } from '../intermediate-representation/model.js';

/**
 * How the generated client is partitioned across files.
 *
 * - `single` (default): one self-contained file.
 * - `split`: schema types + guards in a sibling `<stem>.schemas.ts`; everything
 *   else in the entry file, which re-exports the schemas module.
 */
export type OutputMode = 'single' | 'split';

/** A single file the generator will write to disk. */
export type GeneratedFile = { path: string; content: string };

export type WriterInput = {
  model: ApiModel;
  /**
   * The `--output` anchor path (ends in `.ts`). Multi-file writers derive sibling
   * and per-tag-folder paths from its directory and base name (stem).
   */
  outputPath: string;
  emit: EmitOptions;
};

/**
 * A Writer turns the IR + emit options into the set of files to write. This is
 * the one seam output modes vary at; the emitter (which renders code) stays
 * mode-agnostic.
 */
export type Writer = (input: WriterInput) => GeneratedFile[];

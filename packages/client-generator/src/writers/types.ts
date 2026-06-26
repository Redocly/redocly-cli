import type { EmitOptions } from '../emitters/client.js';
import type { ApiModel } from '../ir/model.js';

/**
 * How the generated client is partitioned across files.
 *
 * - `single` (default): one self-contained file.
 * - `split`: endpoints, schemas, and the shared HTTP runtime in sibling files.
 * - `tags`: one endpoints file per OpenAPI tag; shared schemas + runtime.
 * - `tags-split`: a folder per tag; shared schemas + runtime at the root.
 */
export type OutputMode = 'single' | 'split' | 'tags' | 'tags-split';

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
 * mode-agnostic. Future Phase D facades (functions, framework hooks) plug in here.
 */
export type Writer = (input: WriterInput) => GeneratedFile[];

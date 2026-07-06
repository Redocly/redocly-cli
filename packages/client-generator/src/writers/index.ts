import { singleFileWriter } from './single-file-writer.js';
import { splitWriter } from './split-writer.js';
import type { OutputMode, Writer } from './types.js';

export type { GeneratedFile, OutputMode, Writer, WriterInput } from './types.js';

const WRITERS: Record<OutputMode, Writer> = {
  single: singleFileWriter,
  split: splitWriter,
};

/** Select the writer for an output mode. */
export function getWriter(mode: OutputMode): Writer {
  return WRITERS[mode];
}

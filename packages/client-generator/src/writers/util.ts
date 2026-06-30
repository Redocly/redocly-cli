import { parse } from 'node:path';

import type { OperationModel } from '../ir/model.js';

/**
 * Derive the directory and base name (stem, without `.ts`) from the `--output`
 * anchor path. Multi-file writers build sibling/per-tag paths from these.
 */
export function anchor(outputPath: string): { dir: string; stem: string } {
  const { dir, name } = parse(outputPath);
  return { dir, stem: name };
}

/** All operations across the model's services, flattened. */
export function allOperations(
  operationsByService: { operations: OperationModel[] }[]
): OperationModel[] {
  return operationsByService.flatMap((service) => service.operations);
}

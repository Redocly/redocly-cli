import type { DiffResult } from '../types.js';

export function jsonDiff(result: DiffResult): string {
  return JSON.stringify(result, null, 2);
}

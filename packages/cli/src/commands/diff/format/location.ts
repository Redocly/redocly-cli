import { getLineColLocation, type Location } from '@redocly/openapi-core';

import { formatPath } from '../../../utils/miscellaneous.js';

// Nodes inlined by bundling do not exist in the root source AST;
// getLineColLocation falls back to 1:1 for such pointers.
export function lineColOf(location: Location): { file: string; line: number; col: number } {
  const { start } = getLineColLocation(location);
  return { file: formatPath(location.source.absoluteRef), line: start.line, col: start.col };
}

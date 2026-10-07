import { getLineColLocation, type Location } from '@redocly/openapi-core';

import { formatPath } from '../../../utils/miscellaneous.js';

// A node that a preprocessor or decorator added is not in the text of its file;
// getLineColLocation falls back to 1:1 for such pointers.
export function lineColOf(location: Location): { file: string; line: number; col: number } {
  const { start } = getLineColLocation(location);
  return { file: formatPath(location.source.absoluteRef), line: start.line, col: start.col };
}

import { getLineColLocation, type Source } from '@redocly/openapi-core';

import type { Change, ChangeSide } from './types.js';

// Nodes inlined by bundling do not exist in the root source AST;
// getLineColLocation falls back to 1:1 for such pointers.
function locateSide(side: ChangeSide, source: Source): ChangeSide {
  const { start } = getLineColLocation({ source, pointer: side.pointer, reportOnKey: false });
  return { ...side, file: source.absoluteRef, line: start.line, col: start.col };
}

export function locateChanges(
  changes: Change[],
  baseSource: Source,
  revisionSource: Source
): Change[] {
  return changes.map((change) => ({
    ...change,
    ...(change.base ? { base: locateSide(change.base, baseSource) } : {}),
    ...(change.revision ? { revision: locateSide(change.revision, revisionSource) } : {}),
  }));
}

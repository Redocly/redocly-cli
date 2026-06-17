import { Location } from '../ref-utils.js';
import type { Document } from '../resolve.js';

export function protoLocationToProblemLocation(location: {
  source: Document['source'];
  pointer: string;
  start?: { line: number; col: number };
  end?: { line: number; col: number };
}) {
  if (location.start) {
    return {
      source: location.source,
      pointer: location.pointer,
      start: location.start,
      end: location.end,
    };
  }

  return new Location(location.source, location.pointer);
}

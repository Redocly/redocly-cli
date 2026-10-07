import { typeOf } from './diff-node.js';
import type { Change, DiffNode, Impact } from './types.js';

/** Lowest first. */
export const impacts = ['patch', 'minor', 'major'] as const;

export function impactRank(impact: Impact): number {
  return impacts.indexOf(impact);
}

export function highestImpact(candidates: Impact[]): Impact | undefined {
  return candidates.reduce<Impact | undefined>(
    (highest, impact) =>
      highest === undefined || impactRank(impact) > impactRank(highest) ? impact : highest,
    undefined
  );
}

// What a change means when no rule spoke: something new is a minor, everything else a patch.
// A new component adds nothing to the API until a place uses it, and that place is a change of
// its own.
export function defaultImpact(change: Change): Impact {
  return change.kind === 'added' && !isComponentOrContainer(change.node) ? 'minor' : 'patch';
}

// `components` itself, a map in it such as `schemas`, or a component in that map.
function isComponentOrContainer(node: DiffNode): boolean {
  const map = node.parent;
  return [node, map, map?.parent].some((level) => !!level && typeOf(level) === 'Components');
}

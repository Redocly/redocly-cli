import type { Change, Impact } from './types.js';

/** Lowest first. An impact is the semver part a change requires to be bumped. */
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
export function defaultImpact(kind: Change['kind']): Impact {
  return kind === 'added' ? 'minor' : 'patch';
}

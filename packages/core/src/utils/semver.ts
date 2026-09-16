export type SemverPart = 'major' | 'minor' | 'patch';

export interface Semver {
  major: number;
  minor: number;
  patch: number;
}

// Pre-release and build metadata are accepted and ignored: only the three numbers are compared.
const SEMVER = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/;

export function parseSemver(version: unknown): Semver | undefined {
  const match = typeof version === 'string' ? version.match(SEMVER) : null;
  if (!match) return undefined;
  const [, major, minor, patch] = match;
  return { major: Number(major), minor: Number(minor), patch: Number(patch) };
}

export function formatSemver({ major, minor, patch }: Semver): string {
  return `${major}.${minor}.${patch}`;
}

/** The first part that grew from `from` to `to`; `undefined` when nothing grew. */
export function semverBumpBetween(from: Semver, to: Semver): SemverPart | undefined {
  if (to.major > from.major) return 'major';
  if (to.major === from.major && to.minor > from.minor) return 'minor';
  if (to.major === from.major && to.minor === from.minor && to.patch > from.patch) return 'patch';
  return undefined;
}

export function bumpSemver(version: Semver, part: SemverPart): Semver {
  if (part === 'major') return { major: version.major + 1, minor: 0, patch: 0 };
  if (part === 'minor') return { ...version, minor: version.minor + 1, patch: 0 };
  return { ...version, patch: version.patch + 1 };
}

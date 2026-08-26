// Generator compatibility is the package version under semver: the API model and the
// authoring helpers ARE the contract, and a breaking change to either bumps the major
// (the minor while the package is 0.x). A generator declares the range it was written
// against with `requiresGenerator`, and a CLI outside that range refuses to run it.

import packageJson from '../../package.json' with { type: 'json' };

/** The `@redocly/client-generator` version providing the model and helpers right now. */
export const GENERATOR_VERSION: string = packageJson.version;

type Semver = [major: number, minor: number, patch: number];

function parse(version: string): Semver | undefined {
  // A prerelease (`2.0.0-snapshot.3`) is treated as its release version: snapshots exist
  // to test the release they precede, so they must satisfy the same ranges.
  const match = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(version.trim());
  return match === null ? undefined : [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compare(left: Semver, right: Semver): number {
  return left[0] - right[0] || left[1] - right[1] || left[2] - right[2];
}

/**
 * Whether `version` satisfies `range`, for the four forms a generator may declare:
 * `^1.2.0`, `~1.2.0`, `>=1.2.0`, and an exact `1.2.0`. `undefined` means the range
 * isn't one of those — the caller reports that instead of guessing an answer, since a
 * misread range would either block a working generator or admit a broken one.
 */
export function satisfiesGeneratorRange(version: string, range: string): boolean | undefined {
  const operator = /^[\^~]|^>=/.exec(range.trim())?.[0] ?? '';
  const lower = parse(range.trim().slice(operator.length));
  const actual = parse(version);
  if (lower === undefined || actual === undefined) return undefined;
  if (compare(actual, lower) < 0) return false;
  if (operator === '>=') return true;
  if (operator === '') return compare(actual, lower) === 0;
  if (operator === '~') return actual[0] === lower[0] && actual[1] === lower[1];
  // Caret keeps the leftmost NON-ZERO position fixed: ^1.2.0 allows any 1.x, ^0.2.1 allows
  // 0.2.x, ^0.0.3 allows only 0.0.3.
  if (lower[0] !== 0) return actual[0] === lower[0];
  if (lower[1] !== 0) return actual[0] === 0 && actual[1] === lower[1];
  return compare(actual, lower) === 0;
}

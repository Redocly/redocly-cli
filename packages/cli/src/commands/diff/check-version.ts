import type { Impact } from '@redocly/openapi-core';
import semver from 'semver';

// Pre-release and build metadata are accepted and ignored: only the three numbers are compared.
function releaseOf(version: unknown): string | undefined {
  const parsed = typeof version === 'string' ? semver.parse(version) : null;

  return parsed ? `${parsed.major}.${parsed.minor}.${parsed.patch}` : undefined;
}

// Semver lets a 0.x line break in a minor release, so below 1.0 a minor stands in for a major.
function bumpFor(base: string, required: Impact): Impact {
  return semver.major(base) === 0 && required === 'major' ? 'minor' : required;
}

/**
 * The version a release of these changes takes: the base version bumped as the changes require,
 * or unchanged when they require nothing; `undefined` when the base version is not semver.
 */
export function nextVersion(
  baseVersion: unknown,
  required: Impact | undefined
): string | undefined {
  const base = releaseOf(baseVersion);
  if (!base || required === undefined) return base;
  // `base` is a valid release, so incrementing it cannot fail.
  return semver.inc(base, bumpFor(base, required))!;
}

export function checkVersion(opts: {
  base: unknown;
  revision: unknown;
  required: Impact | undefined;
}): string | undefined {
  const { required } = opts;
  if (required === undefined) return undefined;

  const base = releaseOf(opts.base);
  const revision = releaseOf(opts.revision);

  if (!base || !revision) {
    return '❌ info.version is not a semver string, so --check-version cannot compare it.';
  }

  const bump = bumpFor(base, required);
  const next = nextVersion(base, required)!;

  if (semver.gte(revision, next)) return undefined;

  const moved = base === revision ? `stayed ${base}` : `went ${base} → ${revision}`;

  const belowOne = bump === required ? '' : ' while below 1.0';
  return `❌ info.version ${moved}, but these changes require a ${bump} bump (${next})${belowOne}.`;
}

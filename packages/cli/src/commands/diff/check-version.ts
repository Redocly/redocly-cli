import {
  bumpSemver,
  formatSemver,
  impactRank,
  isPlainObject,
  parseSemver,
  semverBumpBetween,
  type Document,
  type Impact,
} from '@redocly/openapi-core';

export type VersionCheck =
  | { status: 'passed' }
  | { status: 'skipped'; message: string }
  | { status: 'failed'; message: string };

export function getDeclaredVersion(document: Document): unknown {
  return isPlainObject(document.parsed) && isPlainObject(document.parsed.info)
    ? document.parsed.info.version
    : undefined;
}

// Semver lets a 0.x line break in a minor release, so below 1.0 a declared minor
// satisfies a required major.
export function checkVersion(opts: {
  base: unknown;
  revision: unknown;
  required: Impact | undefined;
}): VersionCheck {
  const { required } = opts;
  if (required === undefined) return { status: 'passed' };

  const base = parseSemver(opts.base);
  const revision = parseSemver(opts.revision);
  if (!base || !revision) {
    return {
      status: 'skipped',
      message: '⚠️  info.version is not a semver string; --check-version was skipped.',
    };
  }

  const isRelaxed = base.major === 0 && required === 'major';
  const effectiveRequired: Impact = isRelaxed ? 'minor' : required;
  const declared = semverBumpBetween(base, revision);
  if (declared && impactRank(declared) >= impactRank(effectiveRequired))
    return { status: 'passed' };

  const moved =
    formatSemver(base) === formatSemver(revision)
      ? `stayed ${formatSemver(base)}`
      : `went ${formatSemver(base)} → ${formatSemver(revision)}`;
  const next = formatSemver(bumpSemver(base, effectiveRequired));
  return {
    status: 'failed',
    message: `✖ info.version ${moved}, but these changes require a ${effectiveRequired} bump (${next})${
      isRelaxed ? ' while below 1.0' : ''
    }.`,
  };
}

import { impactRank, isPlainObject, type Document, type Impact } from '@redocly/openapi-core';
import semver from 'semver';

export type VersionCheck =
  | { status: 'passed' }
  | { status: 'skipped'; message: string }
  | { status: 'failed'; message: string };

interface Version {
  major: number;
  minor: number;
  patch: number;
}

// Pre-release and build metadata are accepted and ignored: only the three numbers are compared.
function parseVersion(version: unknown): Version | undefined {
  const parsed = typeof version === 'string' ? semver.parse(version) : null;
  return parsed ? { major: parsed.major, minor: parsed.minor, patch: parsed.patch } : undefined;
}

function format({ major, minor, patch }: Version): string {
  return `${major}.${minor}.${patch}`;
}

/** The first part that grew from `from` to `to`; `undefined` when nothing grew. */
function bumpBetween(from: Version, to: Version): Impact | undefined {
  if (to.major > from.major) return 'major';
  if (to.major === from.major && to.minor > from.minor) return 'minor';
  if (to.major === from.major && to.minor === from.minor && to.patch > from.patch) return 'patch';
  return undefined;
}

function bump(version: Version, part: Impact): Version {
  if (part === 'major') return { major: version.major + 1, minor: 0, patch: 0 };
  if (part === 'minor') return { ...version, minor: version.minor + 1, patch: 0 };
  return { ...version, patch: version.patch + 1 };
}

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

  const base = parseVersion(opts.base);
  const revision = parseVersion(opts.revision);
  if (!base || !revision) {
    return {
      status: 'skipped',
      message: '⚠️  info.version is not a semver string; --check-version was skipped.',
    };
  }

  const isRelaxed = base.major === 0 && required === 'major';
  const effectiveRequired: Impact = isRelaxed ? 'minor' : required;
  const declared = bumpBetween(base, revision);
  if (declared && impactRank(declared) >= impactRank(effectiveRequired))
    return { status: 'passed' };

  const moved =
    format(base) === format(revision)
      ? `stayed ${format(base)}`
      : `went ${format(base)} → ${format(revision)}`;
  const next = format(bump(base, effectiveRequired));
  return {
    status: 'failed',
    message: `✖ info.version ${moved}, but these changes require a ${effectiveRequired} bump (${next})${
      isRelaxed ? ' while below 1.0' : ''
    }.`,
  };
}

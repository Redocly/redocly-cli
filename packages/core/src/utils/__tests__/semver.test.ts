import { bumpSemver, formatSemver, parseSemver, semverBumpBetween } from '../semver.js';

describe('semver', () => {
  it.each([
    ['1.2.3', { major: 1, minor: 2, patch: 3 }],
    ['1.2.3-beta.1+build', { major: 1, minor: 2, patch: 3 }],
    ['1.2', undefined],
    ['v1.2.3', undefined],
    [undefined, undefined],
  ])('parses %s', (version, expected) => {
    expect(parseSemver(version)).toEqual(expected);
  });

  it.each([
    ['1.2.3', '2.0.0', 'major'],
    ['1.2.3', '1.3.0', 'minor'],
    ['1.2.3', '1.2.4', 'patch'],
    ['1.2.3', '1.2.3', undefined],
    ['2.0.0', '1.9.9', undefined],
  ])('reads the bump from %s to %s as %s', (from, to, expected) => {
    expect(semverBumpBetween(parseSemver(from)!, parseSemver(to)!)).toBe(expected);
  });

  it.each([
    ['major', '2.0.0'],
    ['minor', '1.3.0'],
    ['patch', '1.2.4'],
  ] as const)('bumps 1.2.3 by a %s to %s', (part, expected) => {
    expect(formatSemver(bumpSemver(parseSemver('1.2.3')!, part))).toBe(expected);
  });
});

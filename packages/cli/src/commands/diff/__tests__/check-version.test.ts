import { checkVersion, nextVersion } from '../check-version.js';

describe('checkVersion', () => {
  it('passes when the declared bump matches or exceeds the required one', () => {
    expect(checkVersion({ base: '1.2.0', revision: '1.3.0', required: 'minor' })).toBeUndefined();
    expect(checkVersion({ base: '1.2.0', revision: '2.0.0', required: 'patch' })).toBeUndefined();
  });

  it('fails when the version moved less than the changes require', () => {
    expect(checkVersion({ base: '1.2.0', revision: '1.3.0', required: 'major' })).toBe(
      '❌ info.version went 1.2.0 → 1.3.0, but these changes require a major bump (2.0.0).'
    );
  });

  it('fails when the version did not move although something changed', () => {
    expect(checkVersion({ base: '1.2.0', revision: '1.2.0', required: 'patch' })).toBe(
      '❌ info.version stayed 1.2.0, but these changes require a patch bump (1.2.1).'
    );
  });

  it('lets a minor stand in for a major while below 1.0', () => {
    expect(checkVersion({ base: '0.3.1', revision: '0.4.0', required: 'major' })).toBeUndefined();
    expect(checkVersion({ base: '0.3.1', revision: '0.3.2', required: 'major' })).toBe(
      '❌ info.version went 0.3.1 → 0.3.2, but these changes require a minor bump (0.4.0) while below 1.0.'
    );
  });

  it('fails when either version is not semver', () => {
    expect(checkVersion({ base: 'v1', revision: '1.0.0', required: 'patch' })).toBe(
      '❌ info.version is not a semver string, so --check-version cannot compare it.'
    );
  });

  it('passes when nothing changed', () => {
    expect(checkVersion({ base: 'v1', revision: 'v1', required: undefined })).toBeUndefined();
  });
});

describe('nextVersion', () => {
  it('should bump the base version as the changes require, a minor for a major below 1.0', () => {
    expect(nextVersion('1.4.2', 'major')).toBe('2.0.0');
    expect(nextVersion('0.4.2', 'major')).toBe('0.5.0');
  });

  it('should keep the base version when nothing requires a bump', () => {
    expect(nextVersion('1.4.2', undefined)).toBe('1.4.2');
  });

  it('should give nothing for a base version that is not semver', () => {
    expect(nextVersion('v1', 'patch')).toBeUndefined();
  });
});

import { checkVersion } from '../check-version.js';

describe('checkVersion', () => {
  it('passes when the declared bump matches or exceeds the required one', () => {
    expect(checkVersion({ base: '1.2.0', revision: '1.3.0', required: 'minor' })).toEqual({
      status: 'passed',
    });
    expect(checkVersion({ base: '1.2.0', revision: '2.0.0', required: 'patch' })).toEqual({
      status: 'passed',
    });
  });

  it('fails when the version moved less than the changes require', () => {
    expect(checkVersion({ base: '1.2.0', revision: '1.3.0', required: 'major' })).toEqual({
      status: 'failed',
      message: '✖ info.version went 1.2.0 → 1.3.0, but these changes require a major bump (2.0.0).',
    });
  });

  it('fails when the version did not move although something changed', () => {
    expect(checkVersion({ base: '1.2.0', revision: '1.2.0', required: 'patch' })).toEqual({
      status: 'failed',
      message: '✖ info.version stayed 1.2.0, but these changes require a patch bump (1.2.1).',
    });
  });

  it('lets a minor stand in for a major while below 1.0', () => {
    expect(checkVersion({ base: '0.3.1', revision: '0.4.0', required: 'major' })).toEqual({
      status: 'passed',
    });
    expect(checkVersion({ base: '0.3.1', revision: '0.3.2', required: 'major' })).toEqual({
      status: 'failed',
      message:
        '✖ info.version went 0.3.1 → 0.3.2, but these changes require a minor bump (0.4.0) while below 1.0.',
    });
  });

  it('skips with a warning when either version is not semver', () => {
    expect(checkVersion({ base: 'v1', revision: '1.0.0', required: 'patch' })).toEqual({
      status: 'skipped',
      message: '⚠️  info.version is not a semver string; --check-version was skipped.',
    });
  });

  it('passes when nothing changed', () => {
    expect(checkVersion({ base: 'v1', revision: 'v1', required: undefined })).toEqual({
      status: 'passed',
    });
  });
});

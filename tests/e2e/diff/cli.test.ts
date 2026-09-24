import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

import { fixturePath, runDiff } from './helpers.js';

const indexEntryPoint = join(process.cwd(), 'packages/cli/lib/index.js');

// The exit code is the whole point of the command in a pipeline, so it is read off a
// real process rather than out of captured output.
function diffExitCode(fixture: string, ...args: string[]): number | null {
  const { status } = spawnSync(
    'node',
    [indexEntryPoint, 'diff', 'base.yaml', 'revision.yaml', ...args],
    { encoding: 'utf-8', cwd: fixturePath(fixture), env: { ...process.env, NO_COLOR: 'TRUE' } }
  );
  return status;
}

describe('diff command', () => {
  test('exits 1 on major changes with the default --fail-on=major', () => {
    expect(diffExitCode('oas3-breaking-changes')).toBe(1);
  });

  test('exits 0 with --fail-on=none', () => {
    expect(diffExitCode('oas3-breaking-changes', '--fail-on=none')).toBe(0);
  });

  test('exits 0 when the only changes are minor or patch', () => {
    expect(diffExitCode('oas3-parameter-added-optional')).toBe(0);
  });

  test('exits 1 with --fail-on=minor when an optional parameter is added', () => {
    expect(diffExitCode('oas3-parameter-added-optional', '--fail-on=minor')).toBe(1);
  });

  test('rejects --output for the github-actions format', () => {
    const output = runDiff('oas3-breaking-changes', '--format=github-actions', '-o', 'out.txt');
    expect(output).toContain('prints to stdout only');
  });

  test('fails --check-version when info.version is not semver', () => {
    // Every diff fixture keeps a two-part `info.version` (e.g. '1.0'), which is not semver.
    const output = runDiff('oas3-parameter-removed', '--check-version', '--fail-on=none');
    expect(output).toContain('--check-version cannot compare it');
  });

  test('warns that an unresolved reference leaves part of the description unjudged', () => {
    const output = runDiff('unresolved-ref');
    expect(output).toContain("Can't resolve $ref");
    expect(output).toContain('the diff may miss changes there');
  });

  test('refuses to compare across specification families', () => {
    const output = runDiff('cross-family');
    expect(output).toContain('Cannot compare oas2 with oas3_1.');
  });
});

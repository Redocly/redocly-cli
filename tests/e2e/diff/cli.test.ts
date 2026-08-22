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
  test('exits 1 on breaking changes with the default --fail-on=breaking', () => {
    expect(diffExitCode('oas3-breaking-changes')).toBe(1);
  });

  test('exits 0 with --fail-on=none', () => {
    expect(diffExitCode('oas3-breaking-changes', '--fail-on=none')).toBe(0);
  });

  test('exits 0 when the only changes are non-breaking', () => {
    expect(diffExitCode('oas3-parameter-added-optional')).toBe(0);
  });

  test('rejects --output for formats that only print to stdout', () => {
    const output = runDiff('oas3-breaking-changes', '--format=summary', '-o', 'out.txt');
    expect(output).toContain('prints to stdout only');
  });

  test('refuses to compare across specification families', () => {
    const output = runDiff('cross-family');
    expect(output).toContain('different specification families');
  });
});

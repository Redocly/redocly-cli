// The javac bar every Java test shares: compile the given sources into `out/` under
// `dir`, failing with javac's own message. Every language keeps its toolchain helper
// beside its tests.
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

/** Compile `sources` (paths relative to `dir`) for Java 17 with every lint on. */
export function expectJavacPasses(dir: string, sources: string[]): void {
  const result = spawnSync(
    'javac',
    ['--release', '17', '-Xlint:all', '-Werror', '-d', join(dir, 'out'), ...sources],
    { cwd: dir, encoding: 'utf-8' }
  );
  expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
}

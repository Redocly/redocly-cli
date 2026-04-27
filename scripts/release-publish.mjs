import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');

function run(command, args, { allowFailure = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
  });

  if (!allowFailure) {
    if (result.error) {
      throw result.error;
    }

    if (result.status !== 0) {
      throw new Error(
        `${command} exited with status ${result.status ?? 1}: ${args.join(' ')}`,
      );
    }
  }

  return result;
}

let publishFailed = false;

try {
  run('npm', ['--workspace', 'packages/cli', 'run', 'prepare:publish-dir']);
  // Changesets reads `publishConfig.directory` from the package manifest
  // and publishes `packages/cli/.publish` instead of the workspace root.
  run('npm', ['exec', 'changeset', 'publish']);
} catch {
  publishFailed = true;
} finally {
  run('npm', ['--workspace', 'packages/cli', 'run', 'clean:publish-dir'], {
    allowFailure: true,
  });
}

if (publishFailed) {
  process.exit(1);
}

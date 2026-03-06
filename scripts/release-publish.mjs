import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');

function run(command, args, { allowFailure = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (!allowFailure) {
    if (result.error) {
      throw result.error;
    }

    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }
  }

  return result;
}

let publishFailed = false;

try {
  run('npm', ['--workspace', 'packages/cli', 'run', 'prepare:publish-dir']);
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
